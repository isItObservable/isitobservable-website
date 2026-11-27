---
title: "Unlocking Feature Flags with OpenFeature and Flagd: A Deep Dive"
slug: unlocking-feature-flags-with-openfeature-and-flagd-a-deep-dive
category: cloudnative
tags: [feature-flags, openfeature, site-reliability-engineering]
youtubeId: eDu3oRJekuk
publishDate: 2024-07-01
thumbnail: ../../assets/images/maxresdefault.jpg
description: "Learn about Flagd and how it fits into the OpenFeature ecosystem"
---

Welcome to another installment of our OpenTelemetry and SRE series, where we delve into cutting-edge topics to enhance your knowledge and skills. This time, we’re specifically focusing on feature flags.

You might recall our recent episode [introducing OpenFeature](https://www.youtube.com/watch?v=k6ypX3old0Q), but we’re taking it one step further today. If you're specifically interested in an open source feature flag system designed for Kubernetes, you’ll be thrilled to discover [Flagd](https://flagd.dev/).

Now, let’s explore what this blog post has in store for you:

- Introduction to OpenFeature providers

- Flagd and how it fits into the OpenFeature ecosystem

- The functionalities and benefits of the OpenFeature operator

- A deep dive into the observability aspects of OpenFeature.

Before we start, let’s remind ourselves what feature flags are.

## What are feature flags?

Feature flags are software development techniques that allow teams to enable, turn off, or modify features in a production environment without deploying new code. This approach provides greater flexibility, enabling safer and faster feature releases, A/B testing, and gradual rollouts.

Learn more about feature flags in my dedicated blog post: [Understanding Feature Flags: All You Need to Know](/site-reliability-engineering/understanding-feature-flags-all-you-need-to-know).

Now, let’s dive into [OpenFeature](https://openfeature.dev/) providers and how Flagd fits into the picture.

## Introduction to OpenFeature providers

An OpenFeature provider is responsible for implementing the feature flagging functionality. It acts as the backend system that evaluates and delivers feature flag configurations. The feature flag provider helps connect with your feature flag system.

As explained in the previous episode related to OpenFeature, the OpenFeature SDK allows you to use an agnostic SDK to run your feature flag evaluations.

The SDK provides various features:

1. Simple feature flag evaluation, named "static"

2. Complex feature flag evaluation (passing a feature flag context to enable a feature based on the user's age, location, and gender)

3. Connection to Hooks to the OpenFeature client to trigger actions after each successful evaluation, enabling the production of extra observability data.

It’s important to note that you shouldn’t start building hooks before knowing if your feature flag system is already producing data.

### Which OpenFeature providers are available?

OpenFeature currently offers various providers, but their support varies depending on the programming language you intend to use. Here's an overview of the languages supported by each provider:

![OpenFeature providers](~/assets/images/Feature-Flags-Made-Easy-with-Flagd-and-OpenFeature-3-33-screenshot.png)

As you can see, Flagd supports all available languages in this matrix. Let’s have a deeper look into Flagd.

## Flagd

Flagd is an open source feature flag system that does not have a user interface for configuring feature flags. With Flagd, we can define our feature flag rules using a JSON file schema. Flagd will operate near our application and be responsible for monitoring updates to the feature flag rules used by our application.

Flagd relies on a specific JSON format to define feature flag rules, and the schema is well documented in the [Flagd documentation](https://flagd.dev/reference/flag-definitions/#shared-evaluators).

Flagd will have one or several flag definitions, each starting with:

```
Flag_key_name: { 
}
```

For each flag, you need to define:

1. The state: ENABLED

2. Variants: This is a key-value pair listing the different options for the feature flag.

Each option represents a different value that could be returned during a feature flag evaluation.

Make sure to define the default variant. If you use a static flag like a toggle, the evaluation will be based on the specified default value.

If you need to create a more complex rule using the feature flag context based on specific variables, then you’ll need to define the targeting rule. The targeting rule will define a list of conditions using "if," "else," "and," or "or" statements to specify the variant selected based on the condition. This helps accurately define the variant selected when the condition is true and when the condition is false.

When defining your conditions, Flagd offers several operations you can view in their [documentation](https://flagd.dev/reference/flag-definitions/?h=operations#operations).

For example:

```json
{
  "$schema": "https://Flagd.dev/schema/v0/fl...",
  "flags": {
    "new-welcome-banner": {
      "state": "ENABLED",
      "variants": {
        "true": true,
        "false": false
      },
      "defaultVariant": "false",
      "targeting": {
        "if": [
          {
            "ends_with": [
              {
                "var": "email"
              },
              "@example.com"
            ]
          },
          "true",
          "false"
        ]
      }
    }
  }
}
```

In this example, if the context has the variable email and the value ends with @example.com, the variant selected would be True; otherwise, it would be False.

Flagd also helps us create a random distribution of variants. This is possible with fractional:

```json
{
  "$schema": "https://Flagd.dev/schema/v0/fl...",
  "flags": {
    "headerColor": {
      "variants": {
        "red": "#FF0000",
        "blue": "#0000FF",
        "green": "#00FF00"
      },
      "defaultVariant": "red",
      "state": "ENABLED",
      "targeting": {
        "fractional": [
          {
            "var": "email"
          },
          [
            "red",
            50
          ],
          [
            "blue",
            20
          ],
          [
            "green",
            30
          ]
        ]
      }
    }
  }
}
```

This example indicates that if an email is present in the context, 50% would be red, 20% blue, and 30% green. If no email is provided, the default variant will be red.

And if the user uses the same email, they should select the same variant.

The other great thing about Flagd is the observability data. It can produce metrics and traces. We will look at it in detail in the observability section of this article.

To ensure that your code always conforms to the latest feature flag rules, Flagd will synchronize with rules defined in different ways:

- HTTP

- gRPC

- File

- Kubernetes

However, Kubernetes is the most interesting option because it relies on the OpenFeature operator.

## OpenFeature operator

The OpenFeature operator will ease the deployment of flags and help us build our feature flag rules.

This operator introduces new CRDs, the Feature\_flag and the feature\_flag\_source. It will also deploy a new component, the Flagd\_proxy.

### Feature\_flag

The feature flag CRD technically consists of the feature flag rules of flags described earlier. Of course, in this case, it won’t be defined in JSON but using a YAML structure.

For example:

```yaml
apiVersion: core.openfeature.dev/v1beta1
kind: FeatureFlag
metadata:
  name: featureflag-sample
spec:
  flagSpec:
    flags:
      "simple-flag":
        state: "ENABLED"
        variants:
          "on": true
          "off": false
        defaultVariant: "on"
```

### Featureflag\_source

The feature flag source will be used to deploy our workload and define which feature flag rule we want to inject. It specifies which feature flag rules we want to use and which feature flag should be synced. The options are File, HTTP, gRPC, Kubernetes, and flagd\_proxy.

I prefer using the following two modes for managing our feature flag rules:

1. Kubernetes

2. Flagd\_proxy

Kubernetes will monitor updates to the feature flag object deployed in our cluster. This process is highly efficient but requires us to set up the appropriate RBAC for our deployment file. Additionally, it will result in additional API requests to our K8s API after each feature flag evaluation.

If you’re operating in a large cluster, you may want to consider avoiding this type of synchronization and instead opt for the alternative option: Flagd\_proxy.

### Flagd\_proxy

The Flagd\_proxy is running in our cluster and will link the changes to the feature flags defined in our feature flag source. It has the advantage of removing the need to add extra RBAC to the service account used by our deployments.

It will also avoid adding extra requests to the K8s API.

Here is an example of the feature flag source:

```yaml
apiVersion: core.openfeature.dev/v1beta1
kind: FeatureFlagSource
metadata:
  name: feature-flag-source
spec:
  sources: # flag sources for the injected Flagd
    - source: flags/sample-flags # Feature flag - namespace/name
      provider: kubernetes # kubernetes flag source backed by Feature flag custom resource
  port: 8080
```

## Steps required to use Flagd

If you plan to use the flags provider for feature flag evaluation, you'll need to indicate in the OpenFeature SDK that you want to use the Flagd provider.

new FlagdProvider()

This means that it will send all the feature flag evaluations to localhost. The operator is there to inject the right sidecar containers into your workload with the right set of feature flag rules.

So, if you want to use a specific feature flag rule, then you simply need to:

- Create the feature flag CRD with your rules

- Create a feature flag source to map your feature flag rule

- Add the right annotations to your workload.

Here are the annotations that you’ll need to add:

```yaml
annotations:
  openfeature.dev/enabled: "true"
  openfeature.dev/featureflagsource: "featurefloagsoruce name ( in the same namesapce), or NAMSAPCE/name of the feature faltg source"
```

When deploying your workload, the OpenFeature operator will inject the right sidecar container in our pod, and the Flagd container will watch one or more feature sources to sync and build the set of feature flag rules.

So, to summarize, our app has the feature flag SDK with the Flagd provider. The sidecar will receive the SDK evaluation request, but the Flagd sidecar will watch for updates from our feature flag CRD deployed.

## Observability with Flagd

When using feature flags, monitoring which features are enabled closely, the amount of traffic using a specific feature, and more is important.

With OpenFeature, you can easily obtain the necessary details due to the provided hook in the OpenFeature SDK.

On the other hand, if you’re using Flagd, you won’t need to define your hooks. The Flagd provider automatically offers the required functionality.

When deploying Flagd, enabling OpenTelemetry and specifying the Otel endpoint for receiving metrics and traces is possible. It exposes a Prometheus exporter on port 8014 by default, and the default path is /metrics.

The Prometheus exporter settings can be updated by defining the metricPort in the feature flag source.

In terms of metrics, it supports the:

- http.server.duration

- http.server.response.size

- http.server.active\_requests

- feature\_flag.Flagd.impression

- feature\_flag.Flagd.evaluation.reason

And if you enable OpenTelemetry, it will also produce spans:

- flagEvaluationService(resolveX) - SpanKind server

- jsonEvaluator(resolveX) - SpanKind internal

- jsonEvaluator(setState) - SpanKind intern

The only requirement is to define a feature flag source with your OpenTelemetry Collector URL. This is possible by defining the property otelcCollectorUri. The telemetry data would be sent using the otlp gRPC protocol.

For example:

```yaml
iVersion: core.openfeature.dev/v1beta1
kind: FeatureFlagSource
metadata:
  name: feature-flag-source-sample
spec:
  port: 80
  evaluator: json
  tag: main
  sources:
    - source: namespace/name
      provider: kubernetes
  probesEnabled: true
  debugLogging: true
  otelCollectorUri: http://localhost:4317
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 200m
      memory: 256Mi
```

## Learn more about Flagd

To learn more about Flagd, watch the full video tutorial on my YouTube channel: [Feature Flags Made Easy with Flagd and OpenFeature](https://www.youtube.com/watch?v=eDu3oRJekuk)

## Go deeper

- [Learn the basics of Feature Flagging](https://isitobservable.io/site-reliability-engineering/understanding-feature-flags-all-you-need-to-know)
- [Learn more about OpenFeature](https://isitobservable.io/site-reliability-engineering/exploring-openfeature-the-open-standard-for-feature-flags)
