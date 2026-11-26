---
craftId: 313453
title: "Exploring OpenFeature: The Open Standard for Feature Flags"
subline: OpenFeature is an open standard for feature flag management. It provides a unified API to simplify and streamline the use of feature flags across different tools and platforms.
date: 2024-06-27T08:21:00Z
author: giulia-di-pietro
topics:
  - openfeature
  - feature-flags
  - site-reliability-engineering
image:
  src: ~/assets/images/sddefault.jpg
  title: "Unlocking Features with OpenFeature: A Journey into Feature Flags"
  alt: null
youtube: https://www.youtube.com/watch?v=k6ypX3old0Q
related:
  - site-reliability-engineering/unlocking-feature-flags-with-openfeature-and-flagd-a-deep-dive
  - site-reliability-engineering/understanding-feature-flags-all-you-need-to-know
goDeeper:
  - text: All you need to know about feature flags
    url: https://isitobservable.io/site-reliability-engineering/understanding-feature-flags-all-you-need-to-know
---

If you’ve worked with feature flags before, you may have heard of the open source project: [OpenFeature](https://openfeature.dev/).

OpenFeature is an open standard for feature flag management. It provides a unified API to simplify and streamline the use of feature flags across different tools and platforms.

This blog post, inspired by the [YouTube video released recently about OpenFeature](https://www.youtube.com/watch?v=k6ypX3old0Q), will cover:

- The benefits of having an open standard for feature flags

- How OpenFeature works

- Evaluation, Hooks, and Events

- And how to observe flags with OpenFeature

But let’s start with a refresher on what feature flags are.

## What are feature flags?

Feature flags are software development techniques that enable teams to switch features on or off or tweak them in a production environment without deploying fresh code. This approach enhances flexibility, allowing for safer, faster feature releases, effective A/B testing, and smooth, gradual rollouts.

For more in-depth information, read the dedicated blog post: [Understanding Feature Flags: All You Need to Know](/site-reliability-engineering/understanding-feature-flags-all-you-need-to-know)

## Open Standard for Feature Flags: The Benefits

Multiple feature flag management systems exist to help you manage and maintain feature flags in your software development projects. However, these systems lack standardization, leading to inconsistencies, integration challenges, and potential vendor lock-in, making it difficult to seamlessly manage feature flags across diverse environments and tools.

An open standard for feature flags is essential to ensure interoperability, consistency, and ease of integration across different tools and platforms. This will reduce vendor lock-in and enable developers to manage feature flags more efficiently and effectively within diverse, evolving tech stacks.

## How does OpenFeature work?

OpenFeature provides a unified API and SDKs that abstract the complexities of different feature flag management systems, allowing developers to implement feature flags in a standardized way.

It integrates with various feature flag providers, enabling seamless configuration and management of feature flags across multiple environments. Using OpenFeature, developers can define feature flags once and utilize them across different services and applications, ensuring consistency and reducing the overhead of using multiple disparate feature flagging tools.

To achieve this, OpenFeature introduced the concept of OpenFeature Provider.

## OpenFeature Provider: an overview

Each feature flag solution must have a provider defined in OpenFeature. The provider aims to ensure the OpenFeature flag evaluation is correctly translated for the appropriate backend.

To create an OpenFeature client, follow these steps:

```
import { OpenFeature } from '@OpenFeature/server-sdk';
OpenFeature.setProvider(new YourProviderOfChoice());
```

Then you can use the OpenFeature client:

```
const client = OpenFeature.getClient('my-app');
```

### Feature flag Evaluation

Once you have the client defined, you can run Feature Flag evaluations :

```
// get a bool value
const boolValue = await client.getBooleanValue('boolFlag', false);
// get a string value
const stringValue = await client.getStringValue('stringFlag', 'default');
// get an numeric value
const numberValue = await client.getNumberValue('intFlag', 1);
// get an object value
const object = await client.getObjectValue<MyObject>('objectFlag', {})
```

Alternatively, you can perform a detailed evaluation, which provides additional metadata along with the evaluation. This metadata includes:

- Flag Key: The unique identifier for a feature flag

- Value: The value returned from a flag evaluation

- Reason (optional): A string explaining why the flag value was returned

- Variant (optional): The variant associated with the return flag value

- Error Code (optional): An error code that categorizes flag evaluation errors

- Error Message (optional): A string detailing the error.

```
// get details of boolean evaluation
const boolDetails = await client.getBooleanDetails('boolFlag', false);
// get details of string evaluation
const stringDetails = await client.getStringDetails('stringFlag', 'default');
// get details of numeric evaluation
const numberDetails = await client.getNumberDetails('intFlag', 1);
// get details of object evaluation
const objectDetails = await client.getObjectDetails<MyObject>('objectFlag', {});
```

If your feature flag evaluation needs to consider metadata such as age, gender, location, or more, then you must define that metadata in your feature flag system. This also means you need to send this additional data with each feature flag evaluation. This concept is called an **evaluation context**. Each feature evaluation method can take an additional parameter with the feature flag context.

```typescript
// add a value to the invocation context
const context: EvaluationContext = {
  myInvocationKey: 'myInvocationValue',
};
const boolValue = await client.getBooleanValue('boolFlag', false, context);
```

## How to Use Hooks in OpenFeature

Feature flags introduce the concept of [Hooks](https://openfeature.dev/specification/sections/hooks), an impressive feature that allows you to trigger actions at various points in the feature flag evaluation process:

- Before Evaluation: Trigger actions before the evaluation begins

- After Successful Evaluation: Trigger actions after receiving a successful result from the feature flag evaluation

- On Error: Trigger actions if the evaluation generates an error

- Finally: Trigger actions after the evaluation, regardless of whether they succeeded or failed.

Hooks are precisely what you need to enhance your feature flagging system. With hooks, we can log information, collect metrics to count the number of feature flag evaluations and distinguish distributed traces when features are enabled. For example, you can create a span in the after hook to indicate that a feature evaluation has been performed and even add span events. You can add robust monitoring and logging capabilities by leveraging hooks, ensuring better observability and control over your feature flag evaluations.

First, you need to define your hook. For example:

```typescript
export class MyHook implements Hook {
  before(hookContext: HookContext) {
    // code to run before flag evaluation
  }

  after(hookContext: HookContext, evaluationDetails: EvaluationDetails<FlagValue>) {
    // code to run after successful flag evaluation
  }

  error(hookContext: HookContext, err: Error) {
    // code to run if there's an error during before hooks or during flag evaluation
  }

  finally(hookContext: HookContext) {
    // code to run after all other stages, regardless of success/failure
  }
}
```

Then, you need to attach your hook (even for all evaluations).

```
// add a hook globally, to run on all evaluations
OpenFeature.addHooks(new ExampleGlobalHook());
```

Or only for a specific feature flag client:

```
// add a hook on this client, to run on all evaluations made by this client
const client = OpenFeature.getClient();
client.addHooks(new ExampleClientHook());
```

Or we can attach our hook only to a specific flag evaluation:

```typescript
// add a hook for this evaluation only
const value = await client.getBooleanValue(FLAG_KEY, false, context, {
  hooks: [new ExampleInvocationHook()],
});
```

The good news is that most of the OpenFeature SDK already includes an OpenTelemetry Hook, which enables you to define Metrics, Traces, or both. After each flag evaluation, it will create a Span or report the number of successful or error assessments. However, you can customize the level of observability by creating your hooks.

## Events with OpenFeature

The OpenFeature SDK can receive [events](https://openfeature.dev/specification/sections/events/) from the feature flag provider. You can decide what you want to accomplish based on the events the feature flag provider shares. This is especially useful for enhancing your observability data, for example, if the provider is encountering an error, the configuration has suddenly changed, or the cache is not up to date.

The OpenFeature can handle various types of events:

- PROVIDER\_READY: The provider is ready to evaluate flags.

- PROVIDER\_ERROR: The provider has indicated an error

- PROVIDER\_CONFIGURATION\_CHANGED: Changes were made to the backend flag configuration

- PROVIDER\_STALE: The provider's cached state is no longer valid and may not be up-to-date with the source of truth

- PROVIDER\_CONTEXT\_CHANGED\*: The context linked to the provider has changed, and the provider has adjusted its related state.

Currently, OpenFeature supports the following languages: On the backend side: .NET, Go, Java, Node.js, PHP, Python. And on the client side: Android, iOS, and Client-side JavaScript.

## Observability

Utilizing FeatureFlag is great, but as explained in the introduction, it requires analyzing the behavior of your features to transform early access features into common features.

So, observability is one aspect we must consider when implementing feature flags.

Of Course, the vendor of feature flags may already provide a layer of observability…but when it comes to observability data, we want to ingest it back into an observability-backed system to proceed to some feature flag analytics combined with the overall behavior of our components.

As described previously, the great thing about OpenFeature is that the SKD provides out-of-the-box hooks for OpenTelemetry, which will help us automatically produce metrics and traces when evaluating feature flags.

If you plan to implement progress delivery of a feature, the observability angle will be crucial in helping you make the right decision.

Before using the Opentelmetry Hook, ensure that the feature flag provided in the OpenFeature SDK does not already produce telemetry data. Otherwise, you’ll produce twice the same data… which will only increase the actual cost of observation.

## OpenFeature: an overview

What is excellent with the [OpenFeature](http://openfeature.dev) project is that most of the vendors in the feature flag system market are part of this initiative, like:

- [Launchdarkly](https://launchdarkly.com/)

- [Flagsmith](https://www.flagsmith.com/)

- [Harness](https://www.harness.io/products/feature-flags)

- [Cloudbees](https://www.cloudbees.com/)

- [Unleash](https://www.getunleash.io/)

- [Devcycle](https://devcycle.com/)

- [Split.io](https://www.split.io/)

- [Remote Flags](https://remoteflags.com/)

- [Dynatrace](http://dynatrace.com/)

- And more

This means that, similar to OpenTelemetry, most feature flag vendors have adopted the philosophy of OpenFeature.

Learn more about OpenFeature on their website: [openfeature.dev](https://openfeature.dev/).

And watch out for an upcoming blog post and YouTube video on the provider Flagd!
