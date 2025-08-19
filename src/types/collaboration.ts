/**
 * Real-time collaboration types for Academic Explorer
 * Supports multi-user research sessions with annotations, comments, and presence awareness
 */

/**
 * User identification and presence
 */
export interface CollaborationUser {
  /** Unique user identifier */
  id: string;
  /** Display name */
  name: string;
  /** User avatar URL or initials */
  avatar?: string;
  /** User-assigned colour for presence indicators */
  colour: string;
  /** Current user status */
  status: 'online' | 'away' | 'offline';
  /** Last seen timestamp */
  lastSeen: number;
  /** User's current session permissions */
  permissions: UserPermissions;
}

/**
 * User permission levels for collaboration sessions
 */
export interface UserPermissions {
  /** Can view the session */
  canView: boolean;
  /** Can add annotations and comments */
  canAnnotate: boolean;
  /** Can edit annotations and comments from others */
  canEdit: boolean;
  /** Can invite other users */
  canInvite: boolean;
  /** Can manage session settings */
  canAdmin: boolean;
}

/**
 * Permission levels as constants
 */
export type PermissionLevel = 'viewer' | 'annotator' | 'editor' | 'admin' | 'owner';

/**
 * Collaboration session metadata
 */
export interface CollaborationSession {
  /** Unique session identifier */
  id: string;
  /** Session title */
  title: string;
  /** Session description */
  description?: string;
  /** Session owner */
  ownerId: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last activity timestamp */
  lastActivity: number;
  /** Session visibility */
  visibility: 'private' | 'team' | 'public';
  /** Session status */
  status: 'active' | 'paused' | 'archived';
  /** Current participants */
  participants: Map<string, CollaborationUser>;
  /** Session permissions mapping */
  permissions: Map<string, UserPermissions>;
  /** Session settings */
  settings: SessionSettings;
  /** Shareable URL token */
  shareToken?: string;
  /** Expiry time for shareable links */
  shareExpiry?: number;
}

/**
 * Session configuration settings
 */
export interface SessionSettings {
  /** Allow anonymous participants */
  allowAnonymous: boolean;
  /** Maximum number of participants */
  maxParticipants: number;
  /** Require approval for new participants */
  requireApproval: boolean;
  /** Enable session recording */
  enableRecording: boolean;
  /** Auto-save annotations interval */
  autoSaveInterval: number;
  /** Show participant cursors */
  showCursors: boolean;
  /** Show participant selections */
  showSelections: boolean;
  /** Enable voice chat */
  enableVoiceChat: boolean;
  /** Enable screen sharing */
  enableScreenShare: boolean;
}

/**
 * Real-time cursor and selection tracking
 */
export interface UserPresence {
  /** User identifier */
  userId: string;
  /** Current cursor position */
  cursor?: CursorPosition;
  /** Current selection */
  selection?: SelectionRange;
  /** Current viewport bounds */
  viewport?: ViewportBounds;
  /** Current page/route */
  currentRoute: string;
  /** Last activity timestamp */
  lastActivity: number;
  /** Custom presence data */
  metadata?: Record<string, unknown>;
}

/**
 * Cursor position information
 */
export interface CursorPosition {
  /** X coordinate relative to viewport */
  x: number;
  /** Y coordinate relative to viewport */
  y: number;
  /** Target element selector */
  target?: string;
  /** Whether cursor is visible */
  visible: boolean;
}

/**
 * Selection range information
 */
export interface SelectionRange {
  /** Start position */
  start: Position;
  /** End position */
  end: Position;
  /** Selected content */
  content?: string;
  /** Selection type */
  type: 'text' | 'element' | 'custom';
}

/**
 * Generic position interface
 */
export interface Position {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Optional element reference */
  element?: string;
}

/**
 * Viewport bounds for presence awareness
 */
export interface ViewportBounds {
  /** Left boundary */
  left: number;
  /** Top boundary */
  top: number;
  /** Width */
  width: number;
  /** Height */
  height: number;
  /** Zoom level */
  zoom: number;
}

/**
 * Annotation system types
 */
export interface Annotation {
  /** Unique annotation identifier */
  id: string;
  /** Annotation type */
  type: AnnotationType;
  /** Target entity or element */
  target: AnnotationTarget;
  /** Annotation content */
  content: string;
  /** Author information */
  author: Pick<CollaborationUser, 'id' | 'name' | 'avatar' | 'colour'>;
  /** Creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  modifiedAt: number;
  /** Annotation visibility */
  visibility: 'private' | 'team' | 'public';
  /** Annotation status */
  status: 'draft' | 'published' | 'archived';
  /** Tags for categorisation */
  tags: string[];
  /** Reactions and votes */
  reactions: AnnotationReaction[];
  /** Linked comments */
  commentIds: string[];
  /** Annotation position/anchoring */
  position?: AnnotationPosition;
  /** Styling information */
  style?: AnnotationStyle;
}

/**
 * Annotation types
 */
export type AnnotationType = 
  | 'highlight' 
  | 'note' 
  | 'bookmark' 
  | 'question' 
  | 'todo' 
  | 'warning' 
  | 'reference';

/**
 * Annotation target (what is being annotated)
 */
export interface AnnotationTarget {
  /** Target type */
  type: 'entity' | 'search-result' | 'page' | 'selection' | 'element';
  /** Target identifier */
  id: string;
  /** Target URL or route */
  url: string;
  /** Target title */
  title: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Annotation positioning information
 */
export interface AnnotationPosition {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Width */
  width?: number;
  /** Height */
  height?: number;
  /** Anchor point */
  anchor: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  /** Z-index for layering */
  zIndex?: number;
}

/**
 * Annotation visual styling
 */
export interface AnnotationStyle {
  /** Background colour */
  backgroundColor?: string;
  /** Border colour */
  borderColor?: string;
  /** Text colour */
  textColor?: string;
  /** Font size */
  fontSize?: number;
  /** Opacity */
  opacity?: number;
}

/**
 * Annotation reactions (likes, votes, etc.)
 */
export interface AnnotationReaction {
  /** User who reacted */
  userId: string;
  /** Reaction type */
  type: 'like' | 'dislike' | 'helpful' | 'question' | 'approve' | 'reject';
  /** Reaction timestamp */
  timestamp: number;
}

/**
 * Comment system for discussions
 */
export interface Comment {
  /** Unique comment identifier */
  id: string;
  /** Parent annotation or comment ID */
  parentId: string;
  /** Comment thread ID */
  threadId: string;
  /** Comment content */
  content: string;
  /** Comment author */
  author: Pick<CollaborationUser, 'id' | 'name' | 'avatar' | 'colour'>;
  /** Creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  modifiedAt: number;
  /** Comment status */
  status: 'draft' | 'published' | 'edited' | 'deleted';
  /** Replies to this comment */
  replies: Comment[];
  /** Comment reactions */
  reactions: AnnotationReaction[];
  /** Whether comment is resolved */
  resolved: boolean;
  /** User who resolved the comment */
  resolvedBy?: string;
  /** Resolution timestamp */
  resolvedAt?: number;
}

/**
 * Comment thread for organising discussions
 */
export interface CommentThread {
  /** Unique thread identifier */
  id: string;
  /** Thread title */
  title?: string;
  /** Associated annotation ID */
  annotationId?: string;
  /** Target of discussion */
  target: AnnotationTarget;
  /** Root comments in thread */
  comments: Comment[];
  /** Thread participants */
  participants: string[];
  /** Thread status */
  status: 'open' | 'resolved' | 'closed';
  /** Creation timestamp */
  createdAt: number;
  /** Last activity timestamp */
  lastActivity: number;
}

/**
 * Operational transformation for conflict resolution
 */
export interface Operation {
  /** Operation type */
  type: 'insert' | 'delete' | 'retain' | 'format';
  /** Operation position/offset */
  position: number;
  /** Operation length */
  length?: number;
  /** Operation content */
  content?: string;
  /** Operation attributes */
  attributes?: Record<string, unknown>;
  /** Operation timestamp */
  timestamp: number;
  /** User who performed operation */
  userId: string;
  /** Operation identifier */
  id: string;
}

/**
 * Document state for operational transformation
 */
export interface DocumentState {
  /** Document identifier */
  id: string;
  /** Document content */
  content: string;
  /** Document version */
  version: number;
  /** Last modified timestamp */
  lastModified: number;
  /** Pending operations */
  pendingOps: Operation[];
  /** Applied operations */
  appliedOps: Operation[];
}

/**
 * Session recording for playback
 */
export interface SessionRecording {
  /** Recording identifier */
  id: string;
  /** Session identifier */
  sessionId: string;
  /** Recording title */
  title: string;
  /** Recording description */
  description?: string;
  /** Recording start time */
  startTime: number;
  /** Recording end time */
  endTime?: number;
  /** Recording duration in milliseconds */
  duration: number;
  /** Recording status */
  status: 'recording' | 'processing' | 'ready' | 'error';
  /** Recorded events */
  events: RecordedEvent[];
  /** Recording metadata */
  metadata: RecordingMetadata;
}

/**
 * Recorded event for session playback
 */
export interface RecordedEvent {
  /** Event type */
  type: 'navigation' | 'annotation' | 'comment' | 'presence' | 'cursor' | 'selection';
  /** Event timestamp relative to recording start */
  timestamp: number;
  /** User who triggered event */
  userId: string;
  /** Event data */
  data: Record<string, unknown>;
  /** Event identifier */
  id: string;
}

/**
 * Recording metadata
 */
export interface RecordingMetadata {
  /** Number of participants */
  participantCount: number;
  /** Recording quality */
  quality: 'low' | 'medium' | 'high';
  /** File size in bytes */
  fileSize: number;
  /** Compression ratio */
  compressionRatio: number;
  /** Recording format version */
  formatVersion: string;
}

/**
 * WebSocket message types for real-time communication
 */
export type WebSocketMessageType = 
  | 'join-session'
  | 'leave-session'
  | 'user-presence'
  | 'cursor-update'
  | 'selection-update'
  | 'annotation-create'
  | 'annotation-update'
  | 'annotation-delete'
  | 'comment-create'
  | 'comment-update'
  | 'comment-delete'
  | 'operation-apply'
  | 'session-update'
  | 'error'
  | 'heartbeat'
  | 'sync-response'
  | 'sync-request'
  | 'conflict-resolution'
  | 'enhanced-presence';

/**
 * WebSocket message structure
 */
export interface WebSocketMessage {
  /** Message type */
  type: WebSocketMessageType;
  /** Message payload */
  payload: unknown;
  /** Message timestamp */
  timestamp: number;
  /** Sender user ID */
  userId?: string;
  /** Target session ID */
  sessionId: string;
  /** Message identifier */
  id: string;
}

/**
 * Collaboration state interface for the store
 */
export interface CollaborationState {
  /** Current session */
  currentSession: CollaborationSession | null;
  /** Current user */
  currentUser: CollaborationUser | null;
  /** Connection status */
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  /** User presence map */
  userPresence: Map<string, UserPresence>;
  /** Annotations in current session */
  annotations: Map<string, Annotation>;
  /** Comment threads */
  commentThreads: Map<string, CommentThread>;
  /** Active recording */
  activeRecording: SessionRecording | null;
  /** Error messages */
  error: string | null;
  /** Whether currently syncing */
  isSyncing: boolean;
  /** Last sync timestamp */
  lastSync: number;
}

/**
 * Collaboration actions for the store
 */
export interface CollaborationActions {
  // Session management
  joinSession: (sessionId: string, userInfo: Partial<CollaborationUser>) => Promise<void>;
  leaveSession: () => Promise<void>;
  createSession: (sessionInfo: Partial<CollaborationSession>) => Promise<string>;
  updateSession: (updates: Partial<CollaborationSession>) => Promise<void>;
  
  // User management
  updateUser: (updates: Partial<CollaborationUser>) => void;
  updateUserPresence: (presence: Partial<UserPresence>) => void;
  
  // Annotation management
  createAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt' | 'modifiedAt'>) => Promise<string>;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<void>;
  deleteAnnotation: (id: string) => Promise<void>;
  
  // Comment management
  createComment: (comment: Omit<Comment, 'id' | 'createdAt' | 'modifiedAt'>) => Promise<string>;
  updateComment: (id: string, updates: Partial<Comment>) => Promise<void>;
  deleteComment: (id: string) => Promise<void>;
  
  // Real-time operations
  sendOperation: (operation: Omit<Operation, 'id' | 'timestamp'>) => void;
  applyOperation: (operation: Operation) => void;
  
  // Recording
  startRecording: (title?: string) => Promise<string>;
  stopRecording: () => Promise<void>;
  
  // Connection management
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
}

/**
 * Permission helper functions
 */
export const PERMISSION_LEVELS: Record<PermissionLevel, UserPermissions> = {
  viewer: {
    canView: true,
    canAnnotate: false,
    canEdit: false,
    canInvite: false,
    canAdmin: false,
  },
  annotator: {
    canView: true,
    canAnnotate: true,
    canEdit: false,
    canInvite: false,
    canAdmin: false,
  },
  editor: {
    canView: true,
    canAnnotate: true,
    canEdit: true,
    canInvite: false,
    canAdmin: false,
  },
  admin: {
    canView: true,
    canAnnotate: true,
    canEdit: true,
    canInvite: true,
    canAdmin: true,
  },
  owner: {
    canView: true,
    canAnnotate: true,
    canEdit: true,
    canInvite: true,
    canAdmin: true,
  },
};

/**
 * Default session settings
 */
export const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  allowAnonymous: false,
  maxParticipants: 10,
  requireApproval: false,
  enableRecording: true,
  autoSaveInterval: 30000, // 30 seconds
  showCursors: true,
  showSelections: true,
  enableVoiceChat: false,
  enableScreenShare: false,
};