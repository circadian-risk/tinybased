import * as ta from 'type-assertions';
import { ParseTableSchema } from './types';

const ExampleSchema = {
  id: String,
  name: String,
  age: Number,
  isAdmin: Boolean,
  nickname: [String, undefined],
};

type expectedSchemaType = {
  id: string;
  name: string;
  age: number;
  isAdmin: boolean;
  nickname?: string;
};

ta.assert<
  ta.Equal<ParseTableSchema<typeof ExampleSchema>, expectedSchemaType>
>();
