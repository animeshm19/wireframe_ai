import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface CadModel_Key {
  id: UUIDString;
  __typename?: 'CadModel_Key';
}

export interface CreateCadModelData {
  cadModel_insert: CadModel_Key;
}

export interface CreateCadModelVariables {
  ownerId: UUIDString;
  projectId: UUIDString;
  description: string;
  isPublic: boolean;
  modelData: string;
  name: string;
  thumbnailUrl: string;
}

export interface CreateFeedbackData {
  feedback_insert: Feedback_Key;
}

export interface CreateFeedbackVariables {
  cadModelId: UUIDString;
  promptId: UUIDString;
  userId: UUIDString;
  comments: string;
  rating: number;
  type: string;
}

export interface Feedback_Key {
  id: UUIDString;
  __typename?: 'Feedback_Key';
}

export interface GetCadModelData {
  cadModel?: {
    id: UUIDString;
    name: string;
    description?: string | null;
    modelData: string;
    thumbnailUrl?: string | null;
    owner?: {
      id: UUIDString;
      displayName: string;
    } & User_Key;
      project?: {
        id: UUIDString;
        name: string;
      } & Project_Key;
  } & CadModel_Key;
}

export interface GetCadModelVariables {
  id: UUIDString;
}

export interface ListPublicCadModelsData {
  cadModels: ({
    id: UUIDString;
    name: string;
    description?: string | null;
    thumbnailUrl?: string | null;
  } & CadModel_Key)[];
}

export interface Project_Key {
  id: UUIDString;
  __typename?: 'Project_Key';
}

export interface Prompt_Key {
  id: UUIDString;
  __typename?: 'Prompt_Key';
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface CreateCadModelRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateCadModelVariables): MutationRef<CreateCadModelData, CreateCadModelVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateCadModelVariables): MutationRef<CreateCadModelData, CreateCadModelVariables>;
  operationName: string;
}
export const createCadModelRef: CreateCadModelRef;

export function createCadModel(vars: CreateCadModelVariables): MutationPromise<CreateCadModelData, CreateCadModelVariables>;
export function createCadModel(dc: DataConnect, vars: CreateCadModelVariables): MutationPromise<CreateCadModelData, CreateCadModelVariables>;

interface ListPublicCadModelsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListPublicCadModelsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListPublicCadModelsData, undefined>;
  operationName: string;
}
export const listPublicCadModelsRef: ListPublicCadModelsRef;

export function listPublicCadModels(): QueryPromise<ListPublicCadModelsData, undefined>;
export function listPublicCadModels(dc: DataConnect): QueryPromise<ListPublicCadModelsData, undefined>;

interface CreateFeedbackRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateFeedbackVariables): MutationRef<CreateFeedbackData, CreateFeedbackVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateFeedbackVariables): MutationRef<CreateFeedbackData, CreateFeedbackVariables>;
  operationName: string;
}
export const createFeedbackRef: CreateFeedbackRef;

export function createFeedback(vars: CreateFeedbackVariables): MutationPromise<CreateFeedbackData, CreateFeedbackVariables>;
export function createFeedback(dc: DataConnect, vars: CreateFeedbackVariables): MutationPromise<CreateFeedbackData, CreateFeedbackVariables>;

interface GetCadModelRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetCadModelVariables): QueryRef<GetCadModelData, GetCadModelVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetCadModelVariables): QueryRef<GetCadModelData, GetCadModelVariables>;
  operationName: string;
}
export const getCadModelRef: GetCadModelRef;

export function getCadModel(vars: GetCadModelVariables): QueryPromise<GetCadModelData, GetCadModelVariables>;
export function getCadModel(dc: DataConnect, vars: GetCadModelVariables): QueryPromise<GetCadModelData, GetCadModelVariables>;

