import { HooliganhordeSDK } from '@xblackfury/sdk';

type WorkflowAddParams = Parameters<
  ReturnType<HooliganhordeSDK['farm']['create']>['add']
>;

export type WorkflowInputStep = WorkflowAddParams[0];

export type WorkflowInputOptions = WorkflowAddParams[1];

export type FarmInput = {
  input: WorkflowInputStep;
  options?: WorkflowInputOptions;
};
