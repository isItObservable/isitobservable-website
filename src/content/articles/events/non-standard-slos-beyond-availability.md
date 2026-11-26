---
craftId: 222532
title: "Non-standard SLOs: beyond availability"
headline: "Non-standard SLOs: beyond availability"
subline: An [SLO is a Service Level Objective](https://cloud.google.com/architecture/defining-SLOs), meaning the level that you expect a service to achieve most of the time and against which an SLI (Service Level Indicator) is measured.
date: 2022-12-01T08:00:00Z
author: giulia-di-pietro
topics:
  - site-reliability-engineering
  - performance-engineering
image:
  src: ~/assets/images/otherSLOs.png
  title: "Non-standard SLOs: beyond availability"
  alt: null
youtube: https://youtu.be/hZoWu4gxx9w
related:
  - site-reliability-engineering/getting-started-with-sre-part-2
  - site-reliability-engineering/get-started-with-sre-part-1
  - site-reliability-engineering/what-is-performance-engineering
  - events/open-source-observability-and-opentelemetry-a-win-win-for-users
  - events/observability-fundamentals-open-standards
goDeeper:
  - text: Presentation slides
    url: https://www.slideshare.net/Giulia976464/those-other-slospdf
---

On my [YouTube channel](https://www.youtube.com/c/IsitObservable/), I have recently launched a new series called “Observable Lightning Talks”, where I invite three experts of observability to share their knowledge with us.

In my first [episode](https://www.youtube.com/watch?v=hZoWu4gxx9w), I was happy to host Steve McGhee, Aolita Sharma, and Michael Hausenblas, who all shared great stories and learning points from their daily work.

In the next few blog posts, I'll summarize their talks' main takeaways. Starting with Steve McGhee for this one you’re currently reading.

[Steve McGhee](https://twitter.com/stevemcghee) is a reliability advocate working as an SRE for Google Cloud. He worked for 15 years at Google, with a break in between, on different company features: Ads, Gmail, Android, Fiber, and Cloud. In his talk, he shared some tips on what SLOs you can implement for non-standard situations. Let’s find out more.

## What are SLOs?

An [SLO is a Service Level Objective](https://www.dynatrace.com/news/blog/what-are-slos/), meaning the level that you expect a service to achieve most of the time and against which an SLI (Service Level Indicator) is measured.

An SLO measures the ratio of good/total over a time duration. A human will be notified if it’s not good for too long.

![SLO and SLI measurement](~/assets/images/defining-SLOs-graph.png)

In most cases, SLOs would be used to measure the availability (is it up?) or the latency (is it fast?) of request-driven services. But what would you use as SLOs for things like data processing, scheduled execution, and ML models? Here are some ideas proposed by Steve.

## Data processing - Freshness

*The proportion of valid data updated more recently than a threshold.*

If you're generating map tiles for something like google maps, you may know that there is a pipeline system where information comes in on one side and exits on the other. The information will get a timestamp at the exit, for example, when it was generated. If we compare this timestamp to when it was served to the user, you can calculate how old or new the map tile is.

A good value can be defined as the delta between when it was built and when it was served compared to some threshold (an acceptable level of freshness).

```
Good = datetime_served - datetime_built < threshold
```

## Data processing - Coverage

*The proportion of valid data processed successfully.*

If you have a lot of inputs going into different pipelines and going through different outputs, we want to make sure we understand the state of the whole system and see if it drops any inputs for various reasons. For example, is it ok if the system drops 90% of the things it should be processing? It’s up to you and your SLO to decide.

```
Good = valid_records - num_processed < threshold
```

## Scheduled Execution - Skew

*The time difference between when the job should have started and when it did.*

Scheduled jobs don’t always run exactly at the time you schedule them. It’s either late, early, or on time. It’s useful to be flexible, but you need to know how it’s doing. You can measure the time between the scheduled execution and when it started. What is the max allowed threshold?

```
Good = time_started - time_scheduled < max_threshold
and
Time_started - time_scheduled > min_threshold
```

Sometimes, you may be okay with a threshold of 24 hours. In other cases, just 5 minutes.

Knowing what percentage of these executions fit into that window is really useful for understanding the big picture of what's going on in your system.

## Scheduled Execution - Duration

*The time difference between when the job should have been completed and by when it was expected to complete.*

In this SLO, you want to know for how long the execution ran. If a program usually runs for an hour, but you notice over time that the execution goes over that amount of time, you can add more resources to get it under that threshold.

```
good = (time_ended or NOW) - time_started < max_expected
and
time_ended - time_started > min_expected
```

The duration helps you understand if a large system is fast enough as a whole. Setting expected upper/lower boundaries provides a method for knowing what is considered good. (Even jobs that are too short could be an issue.)

## Durability

The durability SLO can be confusing as it tends to have many nines (11), and you'd think at a glance that it's all good. However, durability measures a predicted distribution of potential physical failure modes over time. You can model, understand, and improve durability by adding physical replicas and encoding schemes for storage.

Durability is very different from latency and other SLOs. You can't compare them directly.

## Conclusion: SLOs

SLOs are a measurement of an entire system, not just components. They're an abstraction of how well your system performs at a very high level. That means that you still need to do a deep diagnosis. They don’t replace monitoring but may replace alerting if the alerts are related to your customer's happiness.

With SLOs, you define certain terms for the whole company so everybody understands them the same way: service, goal, criteria, period, performance, period, error budget, etc. They help you interact more transparently without human interpretation.

And this type of abstraction provides a consistent understanding of behavior through change. If you introduce a new system, you can make direct comparisons to show how a new system is better than the old one, thanks to SLOs.
