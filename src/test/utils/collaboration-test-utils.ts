/**
 * Test utilities for collaboration features
 * Provides helper functions and mock data for collaboration testing
 */

import type {
  CollaborationUser,
  CollaborationSession,
  Annotation,
  Comment,
  CommentThread,
  UserPresence,
  Operation,
  SessionRecording,
  AnnotationTarget,
  UserPermissions,
  PermissionLevel,
} from '@/types/collaboration';
import { PERMISSION_LEVELS, DEFAULT_SESSION_SETTINGS } from '@/types/collaboration';

/**
 * Generate a unique ID for testing
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a mock collaboration user
 */
export function createMockUser(overrides: Partial<CollaborationUser> = {}): CollaborationUser {
  const id = generateTestId('user');
  return {
    id,
    name: `Test User ${id.slice(-4)}`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
    colour: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
    status: 'online',
    lastSeen: Date.now(),
    permissions: PERMISSION_LEVELS.annotator,
    ...overrides,
  };
}

/**
 * Create multiple mock users
 */
export function createMockUsers(count: number): CollaborationUser[] {
  const users: CollaborationUser[] = [];
  const colours = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
  
  for (let i = 0; i < count; i++) {
    users.push(createMockUser({
      name: `User ${i + 1}`,
      colour: colours[i % colours.length],
      permissions: i === 0 ? PERMISSION_LEVELS.owner : PERMISSION_LEVELS.annotator,
    }));
  }
  
  return users;
}

/**
 * Create a mock collaboration session
 */
export function createMockSession(overrides: Partial<CollaborationSession> = {}): CollaborationSession {
  const sessionId = generateTestId('session');
  const owner = createMockUser({ permissions: PERMISSION_LEVELS.owner });
  
  return {
    id: sessionId,
    title: `Test Session ${sessionId.slice(-4)}`,
    description: 'A test collaboration session',
    ownerId: owner.id,
    createdAt: Date.now() - 3600000, // 1 hour ago
    lastActivity: Date.now(),
    visibility: 'private',
    status: 'active',
    participants: new Map([[owner.id, owner]]),
    permissions: new Map([[owner.id, PERMISSION_LEVELS.owner]]),
    settings: DEFAULT_SESSION_SETTINGS,
    shareToken: generateTestId('token'),
    shareExpiry: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    ...overrides,
  };
}

/**
 * Create a mock user presence
 */
export function createMockPresence(overrides: Partial<UserPresence> = {}): UserPresence {
  return {
    userId: generateTestId('user'),
    cursor: {
      x: Math.floor(Math.random() * 1920),
      y: Math.floor(Math.random() * 1080),
      target: '.search-result',
      visible: true,
    },
    selection: {
      start: { x: 100, y: 200 },
      end: { x: 300, y: 220 },
      content: 'Selected text for testing',
      type: 'text',
    },
    viewport: {
      left: 0,
      top: Math.floor(Math.random() * 500),
      width: 1920,
      height: 1080,
      zoom: 1,
    },
    currentRoute: '/works/W2345678901',
    lastActivity: Date.now(),
    ...overrides,
  };
}

/**
 * Create a mock annotation target
 */
export function createMockAnnotationTarget(overrides: Partial<AnnotationTarget> = {}): AnnotationTarget {
  return {
    type: 'entity',
    id: 'W2345678901',
    url: '/works/W2345678901',
    title: 'Machine Learning in Academic Research',
    context: {
      entityType: 'work',
      publicationYear: 2023,
    },
    ...overrides,
  };
}

/**
 * Create a mock annotation
 */
export function createMockAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  const author = createMockUser();
  const id = generateTestId('annotation');
  
  return {
    id,
    type: 'highlight',
    target: createMockAnnotationTarget(),
    content: `Test annotation content for ${id}`,
    author: {
      id: author.id,
      name: author.name,
      avatar: author.avatar,
      colour: author.colour,
    },
    createdAt: Date.now() - 1800000, // 30 minutes ago
    modifiedAt: Date.now() - 1800000,
    visibility: 'team',
    status: 'published',
    tags: ['research', 'important'],
    reactions: [],
    commentIds: [],
    position: {
      x: Math.floor(Math.random() * 800),
      y: Math.floor(Math.random() * 600),
      anchor: 'top-left',
    },
    style: {
      backgroundColor: '#FFE066',
      borderColor: '#FFD700',
      opacity: 0.8,
    },
    ...overrides,
  };
}

/**
 * Create multiple mock annotations
 */
export function createMockAnnotations(count: number): Annotation[] {
  const annotations: Annotation[] = [];
  const types = ['highlight', 'note', 'bookmark', 'question'];
  
  for (let i = 0; i < count; i++) {
    annotations.push(createMockAnnotation({
      type: types[i % types.length] as any,
      content: `Annotation ${i + 1}: This is a test annotation with some meaningful content.`,
    }));
  }
  
  return annotations;
}

/**
 * Create a mock comment
 */
export function createMockComment(overrides: Partial<Comment> = {}): Comment {
  const author = createMockUser();
  const id = generateTestId('comment');
  
  return {
    id,
    parentId: generateTestId('annotation'),
    threadId: generateTestId('thread'),
    content: `Test comment content for ${id}`,
    author: {
      id: author.id,
      name: author.name,
      avatar: author.avatar,
      colour: author.colour,
    },
    createdAt: Date.now() - 900000, // 15 minutes ago
    modifiedAt: Date.now() - 900000,
    status: 'published',
    replies: [],
    reactions: [],
    resolved: false,
    ...overrides,
  };
}

/**
 * Create a comment thread with replies
 */
export function createMockCommentThread(overrides: Partial<CommentThread> = {}): CommentThread {
  const threadId = generateTestId('thread');
  const rootComment = createMockComment({ threadId });
  const replies = [
    createMockComment({ 
      threadId, 
      parentId: rootComment.id,
      content: 'First reply to the comment',
    }),
    createMockComment({ 
      threadId, 
      parentId: rootComment.id,
      content: 'Second reply with more detail',
    }),
  ];
  
  rootComment.replies = replies;
  
  return {
    id: threadId,
    title: 'Discussion about Machine Learning',
    annotationId: generateTestId('annotation'),
    target: createMockAnnotationTarget(),
    comments: [rootComment],
    participants: [rootComment.author.id, ...replies.map(r => r.author.id)],
    status: 'open',
    createdAt: rootComment.createdAt,
    lastActivity: Math.max(rootComment.createdAt, ...replies.map(r => r.createdAt)),
    ...overrides,
  };
}

/**
 * Create a mock operation for operational transformation
 */
export function createMockOperation(overrides: Partial<Operation> = {}): Operation {
  return {
    type: 'insert',
    position: Math.floor(Math.random() * 1000),
    length: Math.floor(Math.random() * 50) + 1,
    content: 'Test operation content',
    timestamp: Date.now(),
    userId: generateTestId('user'),
    id: generateTestId('operation'),
    ...overrides,
  };
}

/**
 * Create multiple operations for conflict testing
 */
export function createConflictingOperations(): Operation[] {
  const user1 = generateTestId('user');
  const user2 = generateTestId('user');
  const baseTime = Date.now();
  
  return [
    createMockOperation({
      type: 'insert',
      position: 10,
      content: 'User 1 insert',
      userId: user1,
      timestamp: baseTime,
    }),
    createMockOperation({
      type: 'delete',
      position: 8,
      length: 5,
      userId: user2,
      timestamp: baseTime + 100,
    }),
    createMockOperation({
      type: 'insert',
      position: 15,
      content: 'Conflicting insert',
      userId: user1,
      timestamp: baseTime + 200,
    }),
  ];
}

/**
 * Create a mock session recording
 */
export function createMockRecording(overrides: Partial<SessionRecording> = {}): SessionRecording {
  const recordingId = generateTestId('recording');
  const sessionId = generateTestId('session');
  const startTime = Date.now() - 3600000; // 1 hour ago
  const endTime = Date.now() - 1800000; // 30 minutes ago
  
  return {
    id: recordingId,
    sessionId,
    title: `Recording of ${sessionId.slice(-4)}`,
    description: 'Test session recording',
    startTime,
    endTime,
    duration: endTime - startTime,
    status: 'ready',
    events: [
      {
        type: 'navigation',
        timestamp: 0,
        userId: generateTestId('user'),
        data: { route: '/works/W123456789' },
        id: generateTestId('event'),
      },
      {
        type: 'annotation',
        timestamp: 30000,
        userId: generateTestId('user'),
        data: { action: 'create', annotation: createMockAnnotation() },
        id: generateTestId('event'),
      },
    ],
    metadata: {
      participantCount: 3,
      quality: 'high',
      fileSize: 1024 * 1024, // 1MB
      compressionRatio: 0.7,
      formatVersion: '1.0',
    },
    ...overrides,
  };
}

/**
 * Setup permissions for testing
 */
export function setupTestPermissions(
  level: PermissionLevel
): UserPermissions {
  return { ...PERMISSION_LEVELS[level] };
}

/**
 * Create test scenario data
 */
export interface TestScenario {
  name: string;
  description: string;
  users: CollaborationUser[];
  session: CollaborationSession;
  annotations: Annotation[];
  comments: Comment[];
  operations: Operation[];
}

/**
 * Create a comprehensive test scenario
 */
export function createTestScenario(name: string): TestScenario {
  const users = createMockUsers(3);
  const session = createMockSession({
    title: `${name} Session`,
    participants: new Map(users.map(u => [u.id, u])),
    permissions: new Map(users.map((u, i) => [
      u.id, 
      i === 0 ? PERMISSION_LEVELS.owner : PERMISSION_LEVELS.annotator
    ])),
  });
  
  const annotations = createMockAnnotations(5);
  const comments = annotations.slice(0, 3).map(a => createMockComment({
    parentId: a.id,
    content: `Comment on ${a.content.substring(0, 30)}...`,
  }));
  
  const operations = [
    createMockOperation({ userId: users[0].id }),
    createMockOperation({ userId: users[1].id }),
    createMockOperation({ userId: users[2].id }),
  ];
  
  return {
    name,
    description: `Test scenario: ${name}`,
    users,
    session,
    annotations,
    comments,
    operations,
  };
}

/**
 * Common test scenarios
 */
export const TEST_SCENARIOS = {
  BASIC_COLLABORATION: createTestScenario('Basic Collaboration'),
  MULTI_USER_EDITING: createTestScenario('Multi-User Editing'),
  CONFLICT_RESOLUTION: createTestScenario('Conflict Resolution'),
  PERMISSION_TESTING: createTestScenario('Permission Testing'),
} as const;

/**
 * Wait for async operations in tests
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for condition to be true
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    if (condition()) {
      return;
    }
    await waitFor(interval);
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Simulate user interaction delay
 */
export function simulateUserDelay(): Promise<void> {
  return waitFor(Math.random() * 200 + 50); // 50-250ms
}

/**
 * Simulate network delay
 */
export function simulateNetworkDelay(): Promise<void> {
  return waitFor(Math.random() * 100 + 25); // 25-125ms
}

/**
 * Assert helper for collaboration tests
 */
export function assertCollaborationState(
  actual: any,
  expected: any,
  path: string = ''
): void {
  if (actual === expected) return;
  
  if (typeof actual !== typeof expected) {
    throw new Error(`Type mismatch at ${path}: expected ${typeof expected}, got ${typeof actual}`);
  }
  
  if (actual instanceof Map && expected instanceof Map) {
    if (actual.size !== expected.size) {
      throw new Error(`Map size mismatch at ${path}: expected ${expected.size}, got ${actual.size}`);
    }
    
    for (const [key, value] of expected.entries()) {
      if (!actual.has(key)) {
        throw new Error(`Missing key at ${path}.${key}`);
      }
      assertCollaborationState(actual.get(key), value, `${path}.${key}`);
    }
    return;
  }
  
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) {
      throw new Error(`Array length mismatch at ${path}: expected ${expected.length}, got ${actual.length}`);
    }
    
    for (let i = 0; i < expected.length; i++) {
      assertCollaborationState(actual[i], expected[i], `${path}[${i}]`);
    }
    return;
  }
  
  if (typeof actual === 'object' && actual !== null && expected !== null) {
    for (const key in expected) {
      if (!(key in actual)) {
        throw new Error(`Missing property at ${path}.${key}`);
      }
      assertCollaborationState(actual[key], expected[key], `${path}.${key}`);
    }
    return;
  }
  
  throw new Error(`Value mismatch at ${path}: expected ${expected}, got ${actual}`);
}