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

export async function createTeam(_input: unknown) {
  throw Object.assign(new Error('Team validation is not implemented yet'), { status: 501 });
}

export async function getLeaderboard() {
  return [];
}

export async function suggestWorkouts(_userEmail: string) {
  return Workout.find().limit(1).lean();
}

export { User };
