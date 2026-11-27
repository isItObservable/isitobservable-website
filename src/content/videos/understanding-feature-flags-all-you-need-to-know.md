---
title: "Understanding Feature Flags: All You Need to Know"
slug: understanding-feature-flags-all-you-need-to-know
category: cloudnative
tags: [openfeature, feature-flags, site-reliability-engineering]
youtubeId: k6ypX3old0Q
publishDate: 2024-06-27
thumbnail: ../../assets/images/featureflags.png
description: "Do you want to try out new features in your software without deploying new code? If so, feature flags could be the solution for you."
---

Do you want to try out new features in your software without deploying new code? If so, feature flags could be the solution for you. This blog post will explore feature flags, their history, how to deploy them, and the available tools.

For a more detailed look at [OpenFeature](http://openfeature.dev), take a look at my other blog post: [Exploring OpenFeature: The Open Standard for Feature Flags](/site-reliability-engineering/exploring-openfeature-the-open-standard-for-feature-flags)

## What are feature flags?

Feature flags are a software development strategy that lets teams activate, deactivate, or adjust features in a live production environment without deploying new code. This method offers increased flexibility and promotes safer and quicker feature releases, A/B testing, and incremental rollouts.

## A short history of feature flags

Our application deployment process has evolved over the years. A few years ago, we used to deliver major releases every six months, during which we had to deploy the components of our applications. That method seems outdated now, but it was the norm in the old days of the waterfall methodology. We would spend months building a release and wouldn't get user feedback until six months or more after creating our specs.

Since then, most of us have switched to agile or DevOps methodology, allowing us to be closer to our users and deploy more minor releases to receive faster feedback. Platforms like Kubernetes have simplified the deployment process by enabling us to release each component using an "as code" deployment model. We have also implemented Canary releases or blue-green deployments, which let us deploy a new release of our components to a limited population. After validating the latest release, we can gradually roll it out to all our users.

Instead of releasing all the components or applications simultaneously, our industry has been using a practice since 1970 that allows our developers to release a single feature that can be activated with a toggle. This approach is known as the feature flag.

## What’s the difference between a feature flag and a feature toggle?

The terms "feature toggle" and "feature flag" are often used interchangeably, but there is a difference between the two and how they’re used.

Feature toggles are switches that can turn features and functionalities on and off, while feature flags are logic code snippets that manage a feature's full lifespan—from creation to release to discontinuation.

Although feature toggles came first, they have quickly evolved in complexity and function from simple ON/OFF switches, giving rise to feature flags that handle feature lifecycle management.

## How do feature flags work?

When feature flags were invented, they looked at first like a static check:

```javascript
var useNewAlgorithm = false;
if( useNewAlgorithm ){
  return enhancedSplineReticulation();
}else{
  return oldFashionedSplineReticulation();
}
```

In the past, enabling a feature flag was a manual task requiring developers to toggle a switch to make the feature accessible to all users. Nowadays, the process involves defining feature flag rules on a central server and testing each flag in the code to enable specific features. The significant change is that we can now control feature access from a central location and even enable features for specific customer segments based on metadata such as user location, age, gender, and loyalty program status.

This means that feature flag implementation now looks more like this:

```javascript
if( featureIsEnabled("use-new-SR-algorithm") ){
  return enhancedSplineReticulation();
}else{
  return oldFashionedSplineReticulation();
}
```

Feature flags are similar to switches we use at home to control room lights, allowing us to turn them on or off without altering the house's electrical wiring.

## When should you use feature flags?

If we have a feature that will take several releases to finalize, using a feature flag will help us avoid creating another complex branch and the associated merging nightmares. Ultimately, it allows us to increase our efficiency in building software.

Another advantage is that it increases reliability because we can start testing features with minimal risk of disruption or downtime. We can also measure the value of a given feature by enabling it for specific customers and quickly implement A/B testing to test a feature’s behavior.

Furthermore, it increases control by allowing us to decide who can access a given feature. We can also conduct feature experimentation, testing and showing our feature to limited users. Then, with the help of observability, we can measure the value of a given feature.

## When should you avoid feature flags?

It's important to note that feature flags are not the best option for every situation. For instance, they should not be used as a risk aversion policy, meaning hiding every code change behind a feature just in case of a mistake. There are better ways to catch bugs, such as automated tests or QA processes.

Furthermore, it's important to remember good coding practices and avoid adding unnecessary complexity to your software. Adding too many feature flags and having poor feature flag management can lead to more complications.

## Feature flag management systems

Certain requirements must be considered when working with feature flags. The implementation method can vary, whether through an in-house configuration file, environment variables, or an in-house database. However, managing these feature flags can be challenging and costly, requiring you to build a proper UI for configuration.

An alternative approach is to use a feature flag management system, which can simplify the implementation process and provide valuable observability for your feature flags. While manual setup is also an option, it's important to remember that it would require designing the observability data from scratch. Several feature flag management systems are available on the market, which can help you deal with the complexities associated with feature flag implementation.

- [Launchdarkly](https://launchdarkly.com/)

- [Cloudbees](https://www.cloudbees.com/)

- [Unleash](https://www.getunleash.io/)

- [Flagsmith](https://www.flagsmith.com/)

- [Optimizely](https://www.optimizely.com/)

- [Harness](https://www.harness.io/products/feature-flags)

- [Molasses](https://www.molasses.app/)

- [Growthbook](https://www.growthbook.io/)

- [Devcycle](https://devcycle.com/)

- [Apptimize](https://apptimize.com/)

### How does a feature flag management system work?

To run feature evaluation in your code, you need an SDK library. Afterward, you can define rules using the feature flag system and connect the SDK for evaluation using the "if then else" approach.

In the past, each feature flag system had its own SDK, making switching systems complex. Migration costs were high as all components needed code changes from different vendors to use the new SDK.

However, our community has taken a great initiative by introducing an open standard for feature flags called OpenFeature. [OpenFeature](https://openfeature.dev/) will offer agnostic SDKs, requiring us to specify only the provider we want to use. This is similar to the [OpenTelemetry](http://opentelemetry.io) approach for feature flags. Many of the feature flag management systems mentioned above contribute to its development.

If you’d like to learn more about OpenFeature, you can watch my [YouTube video dedicated to the open standard](https://www.youtube.com/watch?v=k6ypX3old0Q) or read my blog post about it.

## Go deeper

- [Learn more about OpenFeature: the open standard for feature flags](https://isitobservable.io/site-reliability-engineering/exploring-openfeature-the-open-standard-for-feature-flags)
