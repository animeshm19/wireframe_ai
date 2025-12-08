import { CreateCadModelData, CreateCadModelVariables, ListPublicCadModelsData, CreateFeedbackData, CreateFeedbackVariables, GetCadModelData, GetCadModelVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateCadModel(options?: useDataConnectMutationOptions<CreateCadModelData, FirebaseError, CreateCadModelVariables>): UseDataConnectMutationResult<CreateCadModelData, CreateCadModelVariables>;
export function useCreateCadModel(dc: DataConnect, options?: useDataConnectMutationOptions<CreateCadModelData, FirebaseError, CreateCadModelVariables>): UseDataConnectMutationResult<CreateCadModelData, CreateCadModelVariables>;

export function useListPublicCadModels(options?: useDataConnectQueryOptions<ListPublicCadModelsData>): UseDataConnectQueryResult<ListPublicCadModelsData, undefined>;
export function useListPublicCadModels(dc: DataConnect, options?: useDataConnectQueryOptions<ListPublicCadModelsData>): UseDataConnectQueryResult<ListPublicCadModelsData, undefined>;

export function useCreateFeedback(options?: useDataConnectMutationOptions<CreateFeedbackData, FirebaseError, CreateFeedbackVariables>): UseDataConnectMutationResult<CreateFeedbackData, CreateFeedbackVariables>;
export function useCreateFeedback(dc: DataConnect, options?: useDataConnectMutationOptions<CreateFeedbackData, FirebaseError, CreateFeedbackVariables>): UseDataConnectMutationResult<CreateFeedbackData, CreateFeedbackVariables>;

export function useGetCadModel(vars: GetCadModelVariables, options?: useDataConnectQueryOptions<GetCadModelData>): UseDataConnectQueryResult<GetCadModelData, GetCadModelVariables>;
export function useGetCadModel(dc: DataConnect, vars: GetCadModelVariables, options?: useDataConnectQueryOptions<GetCadModelData>): UseDataConnectQueryResult<GetCadModelData, GetCadModelVariables>;
