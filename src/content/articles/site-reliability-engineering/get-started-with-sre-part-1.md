---
craftId: 24716
title: Get started with SRE - Part 1
headline: Get started with SLI/SLO
subline: SRE was introduced to software development by Google at the beginning of the century, and it has now become prevalent in most engineering companies that work with microservices and have a service-based team structure.
date: 2022-01-20T14:20:00Z
author: giulia-di-pietro
topics:
  - site-reliability-engineering
image:
  src: ~/assets/images/slislo.png
  title: How to get started with SLI and SLO with Steve McGhee
  alt: null
youtube: https://www.youtube.com/watch?v=uYC2kcndtVs
related:
  - site-reliability-engineering/getting-started-with-sre-part-2
  - open-telemetry/traces/a-short-guide-to-opentelemetry
goDeeper:
  - text: Read Part 2 of Getting Started with SRE
    url: https://isitobservable.io/site-reliability-engineering/getting-started-with-sre-part-2
---

[Site Reliability Engineering, or SRE](https://www.dynatrace.com/news/blog/what-is-site-reliability-engineering/), has become a buzzword since Google introduced it in the 2000s. Although it’s becoming increasingly prevalent in software development, it can be hard to get started and master SRE concepts.

SRE and observability go hand in hand, so it's fitting to explain these concepts on my Is It Observable YouTube Channel and blog.

This blog post is based on the topics I discussed together with Steve McGhee from Google in my previous episode: [How to get started with SLI/SLO with Steve McGhee](https://www.youtube.com/watch?v=uYC2kcndtVs)

It’s part of a two-part series:

- The first blog post will introduce SLI/SLOs, explaining the concepts and giving you an overview of how Google implements them and which tools they use.

- The second blog post will get more into detail on how to get started with SRE, explaining the process and giving you tips and tricks to be successful. (Part 2 can be found [here](/site-reliability-engineering/getting-started-with-sre-part-2) )

Let’s dive into it and introduce SRE and its related concepts.

## What are SLI/SLOs?

Service Level Indicators and Service Level Objectives enable IT professionals, to keep track of the reliability of their environments. Let’s describe the two concepts in more detail.

### SLI

As already mentioned, SLI is an acronym for Service Level Indicator, but this can't be any type of metric. **An SLI needs to be a ratio of 2 numbers: the number of good events divided by the total number of (valid) events.**

![SLI formula](~/assets/images/text12.png)

As an example:

If I want to know if my service is fast enough, I have to think about the distribution of response times of all requests. Some requests are fast, some are slow.

How can I see if it’s fast enough? Whether the slowest responses are too slow? Or whether most of them are acceptably fast?

The perfect tool to calculate an SLI is the percentile. If we want to know how many requests are very slow (unacceptable tail latency), we can express this by asking "what is the 99th percentile" every N minutes or seconds. If a query is beyond a cut-off point that we perceive as unacceptable (say, 2 seconds), this query is counted as “not good.”

Over time, we have an SLI that can be evaluated: which percentage of queries were acceptable (wrt tail latency) over 14 days?

### What’s the benefit of using SLIs?

When you use SLIs, you avoid using all your metrics tracked by your observability platform. You only select a few indicators to track the level of service delivered to our end users. These metrics can be collected via any observability platform: Prometheus, Dynatrace, Elasticsearch, etc. Most SLI/SLO systems will specify how to retrieve the required indicator from the data source ( in the case of a Prometheus data source, you'll express the Promql to retrieve the SLI).

### SLO

SLO stands for Service Level Objective, and it is dependent on SLIs. While SLIs are the desired ratio, SLOs measure if we’re achieving the right level, given an indicator.

**An SLI could show us a perfect metric, but that does not mean that we're achieving the goal stipulated in the SLO.**

In an [SLO](https://www.dynatrace.com/news/blog/what-are-slos/), you will define a target for a specific period (per day, per hour, per month…) to determine service quality and availability. The goal must be reasonable and achievable. The evaluation period should also be properly defined - we advise 28 or 14 days, depending on how much fluctuation and change happens in your system.

## How does Google implement SLI/SLOs?

Before the advent of SREs, teams at Google were deciding if things were working based on arbitrary metrics. When the idea of an SLO came up, it was an extension of the Service Level Agreements (SLA) that the teams already had. There was so much interaction between teams that you needed to have a deal between them.

SLOs were seen as a shared goal between the teams they were trying to achieve. We wanted teams to have a common language and agree upon a few numbers you could observe from both sides.

SLOs became a lingua franca between service teams. If you take on a new dependency, you can look at the SLOs of the team implementing it and get an idea of how it performs over time. You don’t need to talk to the team to understand their meaning with an arbitrary set of metrics. You can understand the percentage-based numbers because they’re written in the same language as yours.

Teams at Google define their SLOs in one common place. There’s a compliance dashboard that shows the goals that the team has set and what their history is. And it’s all internally available. You can see what services are capable of all over the company.

## How do you choose the right SLI/SLO?

A mistake that SRE beginners often make is to expect services and systems to be reliable 100% of the time. Once you have some experience, you know it’s never the case.

The best way to start is to choose a number based on past performance that you know is acceptable. You can set it as a goal, measure it, and revisit it every 2-3 months. If it was realistic, you’re fine with that metric. If it wasn’t, you should review it and change it.

One way to go is to base it on business metrics, which indicate how happy your customers are with a product. If you can correlate a decrease in happiness and a decrease in the product's reliability, then you know that you need to work on this metric.

If your business is growing and you can decrease your reliability targets while keeping customers happy, that’s great. You have more flexibility to maintain the reliability you already have and experiment more, develop new functionalities, or just try things out.

For example, if you look at mobile devices, quite often, the connectivity of those devices is a lot lower than the reliability of the services they’re trying to call. So, it makes no sense to strive for perfect service reliability when the phone itself can’t achieve that.

## What tools should you use for SRE?

Multiple tools can be used for SRE, including [Nobl 9](https://www.nobl9.com/), [Keptn](https://keptn.sh/), and [Google Cloud Operations](https://cloud.google.com/products/operations) (formerly Stackdriver). We also have our usual observability platforms, like NewRelic, DataDog, and [Dynatrace](https://www.dynatrace.com/), that offer support for SLI/SLOs.

At Google, Borgmon was being used before it “escaped” and inspired the creation of the open-source project Prometheus. There are a lot of similarities between the two tools, and Steve still sees SLOs in Borgmon rules.

There are a couple of open source projects based on Prometheus that Google created.

One is the [Prometheus SLO burn](https://github.com/google/prometheus-slo-burn-example), which shows you what type of Prometheus rules you need to implement to start generating SLO numbers. It helps you understand the burn rate of your budget, comparing slow burn and fast burn. This tool is used for learning about your service and having a base upon which you can build your rules. Going through a process like this is important because it helps you understand what’s happening under the covers and be able to debug the system itself.

Another open source project that came from Google is the [SLO generator](https://github.com/google/slo-generator). This tool computes and exports SLOs, error budgets, and burn rates. It is extensible and already has a lot of integrations with existing sources.

And then we have [OpenSLO](https://openslo.com/), an open source project dedicated to standardizing and rationalizing how you write SLOs with YAML. OpenSLO helps you build a common format between different teams, which is great for transitioning between solutions without impacting your SLI/SLO definition. And a described language like YAML lets you define SLI/SLOs in the source code, making it possible to track changes, see how they evolve and roll them back if needed.

## Get started with SLI/SLOs

Now that we’ve looked at the definitions and got an overview of how SRE is being implemented at Google, thanks to Steve’s input, we will move on to part 2 of the series and see the process of SRE in more detail.
