import { Schema } from 'mongoose';

export interface Counter {
  _id: string;
  seq: number;
}

export const CounterSchema = new Schema<Counter>({
  _id: { type: String },
  seq: { type: Number, default: 0 },
});
