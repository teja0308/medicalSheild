/**
 * In-memory fallback when MongoDB Atlas is unreachable.
 * Keeps policy vectors + audit sessions alive for local demos.
 */

const policyChunks = [];
const auditSessions = [];
let sessionCounter = 1;

export function memoryStoreEnabled() {
  return process.env.USE_MEMORY_STORE === 'true' || process.env.DEMO_MODE === 'true';
}

export function memorySavePolicyChunk(doc) {
  const record = {
    _id: `mem-chunk-${policyChunks.length + 1}`,
    ...doc,
    createdAt: new Date(),
  };
  policyChunks.push(record);
  return record;
}

export function memoryFindPolicyChunks(userId) {
  if (!userId) return [...policyChunks];
  return policyChunks.filter((c) => String(c.userId) === String(userId));
}

export function memoryClearUserPolicies(userId) {
  for (let i = policyChunks.length - 1; i >= 0; i--) {
    if (String(policyChunks[i].userId) === String(userId)) {
      policyChunks.splice(i, 1);
    }
  }
}

export function memoryCreateAuditSession(doc) {
  const record = {
    _id: `mem-session-${sessionCounter++}`,
    ...doc,
    createdAt: new Date(),
  };
  auditSessions.push(record);
  return record;
}

export function memoryListSessions(userId) {
  return auditSessions
    .filter((s) => String(s.userId) === String(userId))
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((s) => ({
      _id: s._id,
      billName: s.billName,
      extractedBillData: { totalBilledAmount: s.extractedBillData?.totalBilledAmount },
      auditResults: { potentialSavings: s.auditResults?.potentialSavings },
      createdAt: s.createdAt,
    }));
}

export function memoryGetSession(id, userId) {
  return auditSessions.find((s) => s._id === id && String(s.userId) === String(userId)) || null;
}

export function memoryUpdateLetter(id, userId, letter) {
  const session = memoryGetSession(id, userId);
  if (!session) return null;
  session.auditResults = { ...session.auditResults, generatedAppealLetter: letter };
  return session;
}

const users = new Map();

export const memUsers = {
  async findByEmail(email) {
    return users.get(email.toLowerCase()) || null;
  },
  async create(user) {
    const record = { _id: `mem-user-${users.size + 1}`, ...user, createdAt: new Date() };
    users.set(record.email.toLowerCase(), record);
    return record;
  },
  async findById(id) {
    for (const user of users.values()) {
      if (String(user._id) === String(id)) return user;
    }
    return null;
  },
};
