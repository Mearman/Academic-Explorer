/**
 * Resource Coordinator with Leader Election
 * Implements leader election using Web Locks API for cross-tab coordination
 * Based on the ChatGPT document specification for leader election and resource management
 */

import { logger } from "@/lib/logger";
import { EventBus } from "./unified-event-bus";
import { MessageChannelCoordinator } from "./message-channel-coordinator";

export interface ResourceOptions {
  resourceId: string;
  acquireTimeout?: number;
  heartbeatInterval?: number;
  maxRetries?: number;
}

export interface ControlMessage {
  type: "REQUEST_RESOURCE" | "RESOURCE_GRANTED" | "REQUEST_CHANNEL" | "CHANNEL_PORT" | "RELEASE_RESOURCE" | "HEARTBEAT" | "LEADER_ANNOUNCEMENT";
  resourceId: string;
  senderId: string;
  targetId?: string;
  payload?: unknown;
  timestamp: number;
}

export interface LeaderStatus {
  isLeader: boolean;
  leaderId?: string;
  followers: string[];
  lastHeartbeat?: number;
}

/**
 * ResourceCoordinator manages leader election and resource acquisition using Web Locks
 * Only one tab can be the leader for a given resource at a time
 */
export class ResourceCoordinator {
  protected readonly id: string;
  protected readonly resourceId: string;
  protected isLeader = false;
  protected leaderId?: string;
  protected followers = new Set<string>();
  protected channel: BroadcastChannel;
  protected messageChannelCoordinator = new MessageChannelCoordinator();
  protected lock?: Lock;
  protected heartbeatInterval?: ReturnType<typeof setInterval>;
  protected options: Required<ResourceOptions>;

  private leaderCallbacks = new Set<(status: LeaderStatus) => void>();
  private followerCallbacks = new Set<(leaderId: string) => void>();

  constructor(
    protected bus: EventBus,
    options: ResourceOptions
  ) {
    this.id = `tab-${Date.now().toString()}-${Math.random().toString(36).substring(2)}`;
    this.resourceId = options.resourceId;
    this.options = {
      acquireTimeout: 10000,
      heartbeatInterval: 5000,
      maxRetries: 3,
      ...options
    };

    // Create control channel for coordination
    this.channel = new BroadcastChannel(`resource-control-${this.resourceId}`);
    this.channel.onmessage = (ev: MessageEvent<ControlMessage>) => {
      this.handleControlMessage(ev.data);
    };

    logger.debug("resource", "ResourceCoordinator created", {
      id: this.id,
      resourceId: this.resourceId
    });

    // Attempt to acquire leadership
    void this.attemptLeadership();
  }

  /**
   * Get current leadership status
   */
  getStatus(): LeaderStatus {
    return {
      isLeader: this.isLeader,
      leaderId: this.leaderId,
      followers: Array.from(this.followers),
      lastHeartbeat: this.heartbeatInterval ? Date.now() : undefined
    };
  }

  /**
   * Register callback for leadership changes
   */
  onLeadershipChange(callback: (status: LeaderStatus) => void): () => void {
    this.leaderCallbacks.add(callback);
    return () => this.leaderCallbacks.delete(callback);
  }

  /**
   * Register callback for follower status
   */
  onFollowerStatus(callback: (leaderId: string) => void): () => void {
    this.followerCallbacks.add(callback);
    return () => this.followerCallbacks.delete(callback);
  }

  /**
   * Request a private MessageChannel with the leader
   */
  async requestChannel(leaderId: string): Promise<MessagePort> {
    if (!leaderId || leaderId === this.id) {
      throw new Error("Cannot request channel with self or invalid leader");
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Channel request timeout"));
      }, this.options.acquireTimeout);

      // Listen for channel port response
      const handleChannelPort = (data: ControlMessage) => {
        if (data.type === "CHANNEL_PORT" &&
            data.senderId === leaderId &&
            data.targetId === this.id) {

          clearTimeout(timeout);
          this.channel.removeEventListener("message", handleChannelPort as unknown as EventListener);

          // Extract the port from the message
          if (data.payload && typeof data.payload === "object" && "port" in data.payload) {
            const port = data.payload.port as MessagePort;
            this.setupFollowerPort(leaderId, port);
            resolve(port);
          } else {
            reject(new Error("Invalid channel port response"));
          }
        }
      };

      this.channel.addEventListener("message", handleChannelPort as unknown as EventListener);

      // Send channel request
      this.sendControlMessage({
        type: "REQUEST_CHANNEL",
        resourceId: this.resourceId,
        senderId: this.id,
        targetId: leaderId,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Release leadership and clean up
   */
  async release(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    if (this.isLeader) {
      // Announce leadership release
      this.sendControlMessage({
        type: "RELEASE_RESOURCE",
        resourceId: this.resourceId,
        senderId: this.id,
        timestamp: Date.now()
      });

      this.isLeader = false;
      this.leaderId = undefined;
    }

    // Close message channels
    this.messageChannelCoordinator.cleanup();

    // Close control channel
    this.channel.close();

    logger.debug("resource", "ResourceCoordinator released", {
      id: this.id,
      resourceId: this.resourceId
    });

    this.bus.emit({
      type: "RESOURCE_RELEASED",
      payload: { resourceId: this.resourceId, coordinatorId: this.id }
    });
  }

  /**
   * Attempt to acquire leadership using Web Locks API
   */
  private async attemptLeadership(): Promise<void> {
    try {
      // Check if Web Locks API is available
      if (!("locks" in navigator)) {
        logger.warn("resource", "Web Locks API not available, using fallback");
        await this.fallbackLeaderElection();
        return;
      }

      logger.debug("resource", "Attempting to acquire leadership lock", {
        resourceId: this.resourceId,
        id: this.id
      });

      // Attempt to acquire the lock
      await navigator.locks.request(
        `leader-${this.resourceId}`,
        { mode: "exclusive" },
        async (lock) => {
          if (!lock) {
            throw new Error("Failed to acquire lock");
          }

          this.lock = lock;
          await this.becomeLeader();

          // Hold the lock until we're done
          return new Promise<void>((resolve) => {
            // The lock will be held until this promise resolves
            // We resolve it when release() is called
            const checkRelease = () => {
              if (!this.isLeader) {
                resolve();
              } else {
                setTimeout(checkRelease, 100);
              }
            };
            checkRelease();
          });
        }
      );

    } catch (error) {
      logger.error("resource", "Failed to acquire leadership", {
        resourceId: this.resourceId,
        id: this.id,
        error: error instanceof Error ? error.message : "Unknown error"
      });

      // Become a follower
      await this.becomeFollower();
    }
  }

  /**
   * Become the leader for this resource
   */
  private async becomeLeader(): Promise<void> {
    this.isLeader = true;
    this.leaderId = this.id;
    this.followers.clear();

    logger.debug("resource", "Became leader", {
      resourceId: this.resourceId,
      id: this.id
    });

    // Announce leadership
    this.sendControlMessage({
      type: "LEADER_ANNOUNCEMENT",
      resourceId: this.resourceId,
      senderId: this.id,
      timestamp: Date.now()
    });

    // Start heartbeat
    this.startHeartbeat();

    // Notify callbacks
    this.notifyLeadershipChange();

    this.bus.emit({
      type: "LEADERSHIP_ACQUIRED",
      payload: { resourceId: this.resourceId, leaderId: this.id }
    });
  }

  /**
   * Become a follower
   */
  private async becomeFollower(): Promise<void> {
    this.isLeader = false;

    // Listen for leader announcements
    logger.debug("resource", "Became follower, waiting for leader", {
      resourceId: this.resourceId,
      id: this.id
    });

    this.bus.emit({
      type: "FOLLOWER_STATUS",
      payload: { resourceId: this.resourceId, followerId: this.id }
    });
  }

  /**
   * Fallback leader election for browsers without Web Locks API
   */
  private async fallbackLeaderElection(): Promise<void> {
    // Simple timestamp-based election
    const electionId = Date.now();

    this.sendControlMessage({
      type: "REQUEST_RESOURCE",
      resourceId: this.resourceId,
      senderId: this.id,
      payload: { electionId },
      timestamp: Date.now()
    });

    // Wait for responses
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        // If no one challenged us, become leader
        if (!this.leaderId) {
          void this.becomeLeader();
        } else {
          void this.becomeFollower();
        }
        resolve();
      }, 1000);
    });
  }

  /**
   * Handle control messages from other tabs
   */
  protected handleControlMessage(msg: ControlMessage): void {
    // Ignore messages from self
    if (msg.senderId === this.id) {
      return;
    }

    logger.debug("resource", "Received control message", {
      type: msg.type,
      from: msg.senderId,
      resourceId: msg.resourceId
    });

    switch (msg.type) {
      case "LEADER_ANNOUNCEMENT":
        if (msg.resourceId === this.resourceId) {
          this.leaderId = msg.senderId;
          if (!this.isLeader) {
            this.notifyFollowerCallbacks(msg.senderId);
          }
        }
        break;

      case "REQUEST_CHANNEL":
        if (this.isLeader && msg.targetId === this.id) {
          this.handleChannelRequest(msg);
        }
        break;

      case "HEARTBEAT":
        if (msg.senderId === this.leaderId) {
          // Update last heartbeat
          this.notifyLeadershipChange();
        }
        break;

      case "RELEASE_RESOURCE":
        if (msg.senderId === this.leaderId) {
          this.leaderId = undefined;
          // Try to become leader
          void this.attemptLeadership();
        }
        break;
    }
  }

  /**
   * Handle channel request from a follower
   */
  private handleChannelRequest(msg: ControlMessage): void {
    if (!this.isLeader || !msg.targetId) {
      return;
    }

    try {
      // Create MessageChannel
      const { port1, port2 } = this.messageChannelCoordinator.createChannel();

      // Setup leader side
      this.setupLeaderPort(msg.senderId, port1);

      // Send port to follower via transferable
      this.sendControlMessage({
        type: "CHANNEL_PORT",
        resourceId: this.resourceId,
        senderId: this.id,
        targetId: msg.senderId,
        payload: { port: port2 },
        timestamp: Date.now()
      }, [port2]);

      this.followers.add(msg.senderId);

      logger.debug("resource", "Channel established with follower", {
        leaderId: this.id,
        followerId: msg.senderId
      });

    } catch (error) {
      logger.error("resource", "Failed to establish channel", {
        leaderId: this.id,
        followerId: msg.senderId,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * Setup leader-side port handling
   */
  protected setupLeaderPort(followerId: string, port: MessagePort): void {
    this.messageChannelCoordinator.registerPort(followerId, port);

    port.onmessage = (ev) => {
      logger.debug("resource", "Received message from follower", {
        leaderId: this.id,
        followerId,
        messageType: ev.data?.type
      });

      this.bus.emit({
        type: "FOLLOWER_MESSAGE",
        payload: {
          followerId,
          message: ev.data
        }
      });
    };

    // Send ready confirmation
    port.postMessage({
      type: "CHANNEL_READY",
      leaderId: this.id,
      timestamp: Date.now()
    });
  }

  /**
   * Setup follower-side port handling
   */
  protected setupFollowerPort(leaderId: string, port: MessagePort): void {
    this.messageChannelCoordinator.registerPort(leaderId, port);

    port.onmessage = (ev) => {
      logger.debug("resource", "Received message from leader", {
        followerId: this.id,
        leaderId,
        messageType: ev.data?.type
      });

      this.bus.emit({
        type: "LEADER_MESSAGE",
        payload: {
          leaderId,
          message: ev.data
        }
      });
    };
  }

  /**
   * Send a control message via BroadcastChannel
   */
  protected sendControlMessage(message: ControlMessage, transfer?: Transferable[]): void {
    try {
      if (transfer) {
        // For transferable objects, we need to use a different approach
        // as BroadcastChannel doesn't support transferables directly
        this.channel.postMessage(message);
      } else {
        this.channel.postMessage(message);
      }
    } catch (error) {
      logger.error("resource", "Failed to send control message", {
        type: message.type,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * Start sending heartbeat messages as leader
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.isLeader) {
        this.sendControlMessage({
          type: "HEARTBEAT",
          resourceId: this.resourceId,
          senderId: this.id,
          timestamp: Date.now()
        });
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Notify leadership change callbacks
   */
  private notifyLeadershipChange(): void {
    const status = this.getStatus();
    for (const callback of this.leaderCallbacks) {
      try {
        callback(status);
      } catch (error) {
        logger.error("resource", "Error in leadership callback", {
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  }

  /**
   * Notify follower callbacks
   */
  private notifyFollowerCallbacks(leaderId: string): void {
    for (const callback of this.followerCallbacks) {
      try {
        callback(leaderId);
      } catch (error) {
        logger.error("resource", "Error in follower callback", {
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  }
}

// Export convenience function to create a resource coordinator
export function createResourceCoordinator(bus: EventBus, options: ResourceOptions): ResourceCoordinator {
  return new ResourceCoordinator(bus, options);
}