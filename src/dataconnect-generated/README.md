# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListPublicCadModels*](#listpubliccadmodels)
  - [*GetCadModel*](#getcadmodel)
- [**Mutations**](#mutations)
  - [*CreateCadModel*](#createcadmodel)
  - [*CreateFeedback*](#createfeedback)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListPublicCadModels
You can execute the `ListPublicCadModels` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listPublicCadModels(): QueryPromise<ListPublicCadModelsData, undefined>;

interface ListPublicCadModelsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListPublicCadModelsData, undefined>;
}
export const listPublicCadModelsRef: ListPublicCadModelsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listPublicCadModels(dc: DataConnect): QueryPromise<ListPublicCadModelsData, undefined>;

interface ListPublicCadModelsRef {
  ...
  (dc: DataConnect): QueryRef<ListPublicCadModelsData, undefined>;
}
export const listPublicCadModelsRef: ListPublicCadModelsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listPublicCadModelsRef:
```typescript
const name = listPublicCadModelsRef.operationName;
console.log(name);
```

### Variables
The `ListPublicCadModels` query has no variables.
### Return Type
Recall that executing the `ListPublicCadModels` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListPublicCadModelsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListPublicCadModelsData {
  cadModels: ({
    id: UUIDString;
    name: string;
    description?: string | null;
    thumbnailUrl?: string | null;
  } & CadModel_Key)[];
}
```
### Using `ListPublicCadModels`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listPublicCadModels } from '@dataconnect/generated';


// Call the `listPublicCadModels()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listPublicCadModels();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listPublicCadModels(dataConnect);

console.log(data.cadModels);

// Or, you can use the `Promise` API.
listPublicCadModels().then((response) => {
  const data = response.data;
  console.log(data.cadModels);
});
```

### Using `ListPublicCadModels`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listPublicCadModelsRef } from '@dataconnect/generated';


// Call the `listPublicCadModelsRef()` function to get a reference to the query.
const ref = listPublicCadModelsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listPublicCadModelsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.cadModels);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.cadModels);
});
```

## GetCadModel
You can execute the `GetCadModel` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getCadModel(vars: GetCadModelVariables): QueryPromise<GetCadModelData, GetCadModelVariables>;

interface GetCadModelRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetCadModelVariables): QueryRef<GetCadModelData, GetCadModelVariables>;
}
export const getCadModelRef: GetCadModelRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getCadModel(dc: DataConnect, vars: GetCadModelVariables): QueryPromise<GetCadModelData, GetCadModelVariables>;

interface GetCadModelRef {
  ...
  (dc: DataConnect, vars: GetCadModelVariables): QueryRef<GetCadModelData, GetCadModelVariables>;
}
export const getCadModelRef: GetCadModelRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getCadModelRef:
```typescript
const name = getCadModelRef.operationName;
console.log(name);
```

### Variables
The `GetCadModel` query requires an argument of type `GetCadModelVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetCadModelVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetCadModel` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetCadModelData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetCadModel`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getCadModel, GetCadModelVariables } from '@dataconnect/generated';

// The `GetCadModel` query requires an argument of type `GetCadModelVariables`:
const getCadModelVars: GetCadModelVariables = {
  id: ..., 
};

// Call the `getCadModel()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getCadModel(getCadModelVars);
// Variables can be defined inline as well.
const { data } = await getCadModel({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getCadModel(dataConnect, getCadModelVars);

console.log(data.cadModel);

// Or, you can use the `Promise` API.
getCadModel(getCadModelVars).then((response) => {
  const data = response.data;
  console.log(data.cadModel);
});
```

### Using `GetCadModel`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getCadModelRef, GetCadModelVariables } from '@dataconnect/generated';

// The `GetCadModel` query requires an argument of type `GetCadModelVariables`:
const getCadModelVars: GetCadModelVariables = {
  id: ..., 
};

// Call the `getCadModelRef()` function to get a reference to the query.
const ref = getCadModelRef(getCadModelVars);
// Variables can be defined inline as well.
const ref = getCadModelRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getCadModelRef(dataConnect, getCadModelVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.cadModel);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.cadModel);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateCadModel
You can execute the `CreateCadModel` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createCadModel(vars: CreateCadModelVariables): MutationPromise<CreateCadModelData, CreateCadModelVariables>;

interface CreateCadModelRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateCadModelVariables): MutationRef<CreateCadModelData, CreateCadModelVariables>;
}
export const createCadModelRef: CreateCadModelRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createCadModel(dc: DataConnect, vars: CreateCadModelVariables): MutationPromise<CreateCadModelData, CreateCadModelVariables>;

interface CreateCadModelRef {
  ...
  (dc: DataConnect, vars: CreateCadModelVariables): MutationRef<CreateCadModelData, CreateCadModelVariables>;
}
export const createCadModelRef: CreateCadModelRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createCadModelRef:
```typescript
const name = createCadModelRef.operationName;
console.log(name);
```

### Variables
The `CreateCadModel` mutation requires an argument of type `CreateCadModelVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateCadModelVariables {
  ownerId: UUIDString;
  projectId: UUIDString;
  description: string;
  isPublic: boolean;
  modelData: string;
  name: string;
  thumbnailUrl: string;
}
```
### Return Type
Recall that executing the `CreateCadModel` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateCadModelData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateCadModelData {
  cadModel_insert: CadModel_Key;
}
```
### Using `CreateCadModel`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createCadModel, CreateCadModelVariables } from '@dataconnect/generated';

// The `CreateCadModel` mutation requires an argument of type `CreateCadModelVariables`:
const createCadModelVars: CreateCadModelVariables = {
  ownerId: ..., 
  projectId: ..., 
  description: ..., 
  isPublic: ..., 
  modelData: ..., 
  name: ..., 
  thumbnailUrl: ..., 
};

// Call the `createCadModel()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createCadModel(createCadModelVars);
// Variables can be defined inline as well.
const { data } = await createCadModel({ ownerId: ..., projectId: ..., description: ..., isPublic: ..., modelData: ..., name: ..., thumbnailUrl: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createCadModel(dataConnect, createCadModelVars);

console.log(data.cadModel_insert);

// Or, you can use the `Promise` API.
createCadModel(createCadModelVars).then((response) => {
  const data = response.data;
  console.log(data.cadModel_insert);
});
```

### Using `CreateCadModel`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createCadModelRef, CreateCadModelVariables } from '@dataconnect/generated';

// The `CreateCadModel` mutation requires an argument of type `CreateCadModelVariables`:
const createCadModelVars: CreateCadModelVariables = {
  ownerId: ..., 
  projectId: ..., 
  description: ..., 
  isPublic: ..., 
  modelData: ..., 
  name: ..., 
  thumbnailUrl: ..., 
};

// Call the `createCadModelRef()` function to get a reference to the mutation.
const ref = createCadModelRef(createCadModelVars);
// Variables can be defined inline as well.
const ref = createCadModelRef({ ownerId: ..., projectId: ..., description: ..., isPublic: ..., modelData: ..., name: ..., thumbnailUrl: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createCadModelRef(dataConnect, createCadModelVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.cadModel_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.cadModel_insert);
});
```

## CreateFeedback
You can execute the `CreateFeedback` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createFeedback(vars: CreateFeedbackVariables): MutationPromise<CreateFeedbackData, CreateFeedbackVariables>;

interface CreateFeedbackRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateFeedbackVariables): MutationRef<CreateFeedbackData, CreateFeedbackVariables>;
}
export const createFeedbackRef: CreateFeedbackRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createFeedback(dc: DataConnect, vars: CreateFeedbackVariables): MutationPromise<CreateFeedbackData, CreateFeedbackVariables>;

interface CreateFeedbackRef {
  ...
  (dc: DataConnect, vars: CreateFeedbackVariables): MutationRef<CreateFeedbackData, CreateFeedbackVariables>;
}
export const createFeedbackRef: CreateFeedbackRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createFeedbackRef:
```typescript
const name = createFeedbackRef.operationName;
console.log(name);
```

### Variables
The `CreateFeedback` mutation requires an argument of type `CreateFeedbackVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateFeedbackVariables {
  cadModelId: UUIDString;
  promptId: UUIDString;
  userId: UUIDString;
  comments: string;
  rating: number;
  type: string;
}
```
### Return Type
Recall that executing the `CreateFeedback` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateFeedbackData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateFeedbackData {
  feedback_insert: Feedback_Key;
}
```
### Using `CreateFeedback`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createFeedback, CreateFeedbackVariables } from '@dataconnect/generated';

// The `CreateFeedback` mutation requires an argument of type `CreateFeedbackVariables`:
const createFeedbackVars: CreateFeedbackVariables = {
  cadModelId: ..., 
  promptId: ..., 
  userId: ..., 
  comments: ..., 
  rating: ..., 
  type: ..., 
};

// Call the `createFeedback()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createFeedback(createFeedbackVars);
// Variables can be defined inline as well.
const { data } = await createFeedback({ cadModelId: ..., promptId: ..., userId: ..., comments: ..., rating: ..., type: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createFeedback(dataConnect, createFeedbackVars);

console.log(data.feedback_insert);

// Or, you can use the `Promise` API.
createFeedback(createFeedbackVars).then((response) => {
  const data = response.data;
  console.log(data.feedback_insert);
});
```

### Using `CreateFeedback`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createFeedbackRef, CreateFeedbackVariables } from '@dataconnect/generated';

// The `CreateFeedback` mutation requires an argument of type `CreateFeedbackVariables`:
const createFeedbackVars: CreateFeedbackVariables = {
  cadModelId: ..., 
  promptId: ..., 
  userId: ..., 
  comments: ..., 
  rating: ..., 
  type: ..., 
};

// Call the `createFeedbackRef()` function to get a reference to the mutation.
const ref = createFeedbackRef(createFeedbackVars);
// Variables can be defined inline as well.
const ref = createFeedbackRef({ cadModelId: ..., promptId: ..., userId: ..., comments: ..., rating: ..., type: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createFeedbackRef(dataConnect, createFeedbackVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.feedback_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.feedback_insert);
});
```

