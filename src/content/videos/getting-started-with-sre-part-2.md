---
title: "Get started with SRE - Part 2"
slug: getting-started-with-sre-part-2
category: cloudnative
tags: [site-reliability-engineering]
youtubeId: uYC2kcndtVs
publishDate: 2022-01-20
thumbnail: ../../assets/images/slislo.png
description: "SRE is easy to understand but hard to master. Let’s look at some practical tips on how to get started with SLO/SLIs in your software development project."
---

[In part one of this blog series](/site-reliability-engineering/get-started-with-sre-part-1), we’ve defined what SLI/SLOs are and have a broad overview of how to use them. Now, let’s dive into the practical part: how to start with SRE.

## SLI/SLO process overview

To start building your SLOs, we recommend the following process:

- List the critical business transactions

- Define good indicators

- Define objectives

- Define error budget

- Define alerts

Here’s what you need to do:

## Google Hipster Shop example

I’ve already used the Google Hipster Shop in one of the [previous episodes of Is It Observable](https://www.youtube.com/c/IsitObservable). I’m using it again here because it’s a very easy and understandable example for SRE.

Let’s follow the steps mentioned above one by one.

### 1. List the critical business transactions

Critical business transactions are actions on your system that are critical for your business's survival. If this action fails, it could damage your business and its reputation.

Try to order the critical business transactions by business priority. What are the ones that will help you drive your business and your customer satisfaction?

For the Google Hipster Shop, a crucial transaction is the **Add to cart** action.

### 2. Define good indicators

If we think of the **Add to cart** action, what would help us measure customer satisfaction with it?

For example, we could think of:

1. Response time (speed)

2. Availability of our environment

There are different ways you could do it. One way would be to combine the two metrics into one SLI and track how many good and fast requests there were. Another way to do it is to split them and calculate how many times it successfully added something to the cart and if we're adding something fast enough. Separating the two concerns can become helpful down the line.

### 3. Define objectives

How do you get to an SLO from those SLIs we defined?

For the availability SLI, for example, we’re essentially tracking the amount of 20X HTTP response codes. You can get to your SLO if you measure those against all valid requests.

What is a valid request?

There are certain types of requests or responses you would ignore. For example,

- The user causes 40X responses, so you would ignore them since you're only interested in what your system is doing.

- 30X redirects can often be ignored because they're sometimes built into the system for specific reasons.

You want to ensure that you track the 50X responses; they're the bad things. These responses should be in the denominator (valid events) while the 20X are in the nominator (good events).

![SLI formula](~/assets/images/text12.png)

*TIP: Make sure that you use 20X responses that are good, and not 20X responses that are actually errors. This is an issue that happens quite often.*

For response time, you should think about what is the acceptable amount of time for users and what is unacceptable, and base your objective on this cutoff point.

![SLO SLI emotion graph](~/assets/images/emotihnaol_graph.jpeg)

It’s helpful to have two cutoffs:

- One that is a very long cutoff, like 10 seconds. Nobody would ever wait so long for a positive response. If something takes longer than 10 seconds, we will call it an error, even if the response is positive.

- And one that is a reasonable response time, like 1 second. That’s our desired cutoff time.

Anything beyond 10s is marked as unavailable and goes into the availability filter, even though it technically returned a result.

In the latency SLO, we would mark as slow everything that takes longer than 1s. Everything faster than 1s, will be marked as fast. Then we would measure slow vs. total.

That’s why it’s useful to have two indicators: we might still be available but could have slowed down in the meantime. Only one indicator would not show this type of issue.

#### How long should the time window be for SLOs?

We recommend measuring SLOs for the same time as your software development sprints, usually 14 or 28 days. Depending on how often changes are done in the systems and how large they are.

Engineering time takes around the same amount of time, so if you try to measure too quickly, you won’t be able to see if the changes you made affected the SLOs.

Once you have measured them over a long period of time, it’s important to revisit them - not only to check the SLO but also to check if the duration is appropriate. Are we missing critical events because our time windows are too long? Or are we gathering too much information because the windows are too short?

#### What’s a good threshold for the availability SLO?

We’ve come to expect that internet systems work most of the time. It is pretty low for most internet services if you expect it to run at 90% availability. Occasionally, we have 95%, but it’s never acceptable to run at 70% or something like that - unless they're systems that need to run at specific times. (For example, trading systems need to work at 99% when people are in the office, but at night-time, they can be off - in this case, have 2 different SLOs: one for daytime and one for night-time, if the latter is needed at all).

### 4. Define error budget

How to calculate the error budget? The error budget is, simply put, the inverse of the SLO.

If you have a 99% SLO, then the error budget is 1%. You look at how many requests came in during this time, and we allow a max of 1% errors. It’s pretty straightforward.

The real question is, what do we do with the error budget? Are we waiting for it to be depleted, or are we doing something more clever than that? If you have a pool of money that you use during the month to spend on groceries, you don’t want to keep spending until your pool is depleted and you have to go without food for 2 weeks.

You want to have a spreadsheet keeping track of how much you’re spending every month and ensure that by the end of the month, we still have one week’s worth of money left.

We call this the burn rate. You get a pool of errors upfront, and then you look at how fast you’re burning through them.

If you’re tracking your SLO over 28 days, you want to be aware of **the slow burn**. This happens when you introduce something new with a bit of error, which trickles and by the end of the period makes you exceed your budget. These errors are hard to find in traditional monitoring because it’s not a huge edge on graphs. It’s a tiny line that builds up over time.

**The fast burn** would be what we're already familiar with. We push a new configuration, and it’s just broken, or a piece of infrastructure fails. That’s when we see the big cliffs in graphs: all status codes 200 turn to status codes 500.

In this case, we can look at our error budget and say that we did not use it because we pushed something that broke many things at once. It’s bad. We can extrapolate the data with Prometheus and see how fast we're burning the budget. If we’d let it be, for example, we would deplete our budget in 25 minutes. So you need to step in and do something before the budget gets burned out. After the fix, we go back to a normal level, and that’s it.

### 5. Define alerts

The response should not be the same for the two types of burn rates. One should be an alert, one should be a ticket.

Fast burn rates usually turn into alerts. It should be an actionable and very clear alert that prompts somebody to come in and do something. You need to drop everything and come look at this error.

The slow burn is a ticket-level alert. It needs to be looked at by the end of the period. You have 7/14/28 days to fix this before it becomes a problem.

## Some final recommendations on SRE

SLOs sound really easy, but unfortunately, they’re not. And this short guide has only scratched the surface of what SRE can do. Depending on your tools and services, things get more complex over time. You need to put some thought into it.

The best thing you can do is to think about your customer’s happiness. What keeps your customers happy today, and what could cause your customers to become unhappy? If you can enumerate all the ways your customers could become unhappy with your services, those are your SLOs.

I hope these two blog posts have given you enough information to start with Site Reliability Engineering. If you’d like to, please watch the full video with Steve McGhee here: [How to get started with SLI/SLO with Steve McGhee](https://www.youtube.com/watch?v=uYC2kcndtVs)

And to wrap it all up, here are some recommended readings to dive into the topic further:

- [Implementing Service Level Objectives by Alex Hidalgo](https://www.oreilly.com/library/view/implementing-service-level/9781492076803/)

- Online workshops created by Google on SRE: [The Art of SLOs](https://sre.google/resources/practices-and-processes/art-of-slos/) and the [SLI Menu](https://www.coursera.org/lecture/site-reliability-engineering-slos/the-sli-menu-CST0V).

## Go deeper

- [Read Part 1 of Getting Started with SRE](https://isitobservable.io/site-reliability-engineering/get-started-with-sre-part-1)
