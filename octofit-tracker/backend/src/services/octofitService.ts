import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  const payload = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const { userId, teamId, type, minutes } = payload;

  if (!userId || typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
    const error = new Error('A valid userId is required.');
    Object.assign(error, { status: 400 });
    throw error;
  }

  if (!teamId || typeof teamId !== 'string' || !mongoose.Types.ObjectId.isValid(teamId)) {
    const error = new Error('A valid teamId is required.');
    Object.assign(error, { status: 400 });
    throw error;
  }

  if (typeof type !== 'string' || !type.trim()) {
    const error = new Error('Activity type is required.');
    Object.assign(error, { status: 400 });
    throw error;
  }

  const numericMinutes = Number(minutes);
  if (!Number.isFinite(numericMinutes) || numericMinutes <= 0) {
    const error = new Error('Activity minutes must be a positive number.');
    Object.assign(error, { status: 400 });
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found.');
    Object.assign(error, { status: 404 });
    throw error;
  }

  const team = await Team.findById(teamId);
  if (!team) {
    const error = new Error('Team not found.');
    Object.assign(error, { status: 404 });
    throw error;
  }

  const activity = await Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes: numericMinutes,
    points: Math.max(1, Math.round(numericMinutes)),
    occurredAt: new Date(),
  });

  return activity.toObject ? activity.toObject() : activity;
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  const payload = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const { name, mascot, members } = payload;

  if (typeof name !== 'string' || !name.trim()) {
    const error = new Error('Team name is required.');
    Object.assign(error, { status: 400 });
    throw error;
  }

  if (typeof mascot !== 'string' || !mascot.trim()) {
    const error = new Error('Team mascot is required.');
    Object.assign(error, { status: 400 });
    throw error;
  }

  const normalizedMembers = Array.isArray(members)
    ? members.map((member) => {
        if (typeof member === 'string') {
          if (!mongoose.Types.ObjectId.isValid(member)) {
            const error = new Error('Team members must be valid ObjectIds.');
            Object.assign(error, { status: 400 });
            throw error;
          }
          return new mongoose.Types.ObjectId(member);
        }
        if (member && typeof member === 'object' && '_id' in member && member._id && typeof (member as { _id?: unknown })._id === 'string') {
          return new mongoose.Types.ObjectId((member as { _id: string })._id);
        }
        const error = new Error('Team members must be valid ObjectIds.');
        Object.assign(error, { status: 400 });
        throw error;
      })
    : [];

  const team = await Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members: normalizedMembers,
  });

  return team.toObject ? team.toObject() : team;
}

export async function getLeaderboard() {
  const rows = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $sort: { totalPoints: -1, _id: 1 } },
    { $lookup: { from: 'teams', localField: '_id', foreignField: '_id', as: 'team' } },
    { $unwind: '$team' },
    { $project: { _id: 0, teamName: '$team.name', totalPoints: 1 } },
  ]);

  return rows.map((row, index) => ({
    teamName: row.teamName,
    totalPoints: row.totalPoints,
    rank: index + 1,
  }));
}

export async function suggestWorkouts(userEmail: string) {
  const normalizedEmail = userEmail?.trim();
  const user = await User.findOne({ email: normalizedEmail }).lean();
  if (!user) {
    const error = new Error('User not found.');
    Object.assign(error, { status: 404 });
    throw error;
  }

  const recentActivity = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(1).lean();
  const recentType = recentActivity[0]?.type;
  const preferredFocuses = [user.fitnessGoal, recentType].filter(Boolean) as string[];

  const candidates = await Workout.find({ focus: { $in: preferredFocuses } }).lean();
  if (candidates.length === 0) {
    const fallback = await Workout.find().lean();
    return fallback.map((workout) => ({
      ...workout,
      reason: `Recommended based on recent activity patterns for ${user.name ?? user.email}.`,
    }));
  }

  const prioritized = [...candidates].sort((a, b) => {
    const aPriority = preferredFocuses.indexOf(a.focus) === -1 ? Number.MAX_SAFE_INTEGER : preferredFocuses.indexOf(a.focus);
    const bPriority = preferredFocuses.indexOf(b.focus) === -1 ? Number.MAX_SAFE_INTEGER : preferredFocuses.indexOf(b.focus);
    return aPriority - bPriority;
  });

  return prioritized.map((workout) => ({
    ...workout,
    reason: user.fitnessGoal && workout.focus === user.fitnessGoal
      ? `Matches your ${user.fitnessGoal} goal and recent activity patterns.`
      : `Builds on your recent ${recentType ?? 'activity'} pattern.`,
  }));
}

export { User };
