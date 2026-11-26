---
craftId: 131105
title: What is Chaos Engineering?
subline: Chaos engineering is a software engineering practice where turbulent and unexpected conditions are unleashed in a system to test if it can withstand them.
date: 2022-03-18T00:30:00Z
author: giulia-di-pietro
topics:
  - chaos-engineering
  - site-reliability-engineering
image:
  src: ~/assets/images/chaos.png
  title: What is Chaos Engineering? with Sayan Mondal From Litmus Chaos
  alt: null
youtube: https://www.youtube.com/watch?v=qLIF8-xGrqc
related:
  - site-reliability-engineering/get-started-with-sre-part-1
  - site-reliability-engineering/getting-started-with-sre-part-2
  - site-reliability-engineering/how-to-create-chaos-experiments-with-litmus
  - site-reliability-engineering/what-is-performance-engineering
goDeeper:
  - text: Visit the Litmus GitHub Repository
    url: https://github.com/litmuschaos/litmus
---

Many years ago, we used to build applications, test them, and deploy them to production, believing that our systems would withstand anything that could happen on live. We tested it before deploying, right? And our Ops team delivers stable instances and networks, so we have nothing to worry about - right?

Unfortunately, that might have only been true for the simple systems that existed before.

Nowadays, environments and systems are becoming more and more complex. We mix cloud instances with on-premises data and Saas solutions. All of this together just increases our risk of failure.

That’s why it’s a good idea to learn how to prevent potential disruptions that can generate major outages. Introducing: Chaos engineering.

## What is Chaos Engineering?

[Chaos Engineering](https://www.dynatrace.com/news/blog/what-is-chaos-engineering/) is a unique engineering strategy that aims to discover vulnerabilities in a distributed system. The concept is simple: you inject failures and errors into your applications and observe what happens.

This means that a good level of observability is a requirement of sound chaos engineering, otherwise, you wouldn’t get any insights into your system’s behavior.

The goal is to:

- Identify weak points in a system.

- See in real-time how a system responds to pressure.

- Prepare the team for real failures

- Identify bugs that could cause system-wide issues.

With Chaos Engineering, you aren’t breaking things for fun, but you're trying to discover issues that could impact your environment and end users.

According to the official Principles of Chaos Engineering:

“Chaos Engineering is the discipline of experimenting on a system to build confidence in the system’s capability to withstand turbulent conditions in production.” Source: [principlesofchaos.org](https://principlesofchaos.org/)

You might be asking yourself: Did they mean to say **production**?

Well, yes. You can and should run chaos experiments in your production environment. Still, before you do that, you should learn the basics and be sure of what you’re doing by practicing in other environments, like staging or pre-production.

Once you have enough maturity, you can think of running your chaos experiments directly in your production environment.

## Chaos Engineering Principles

Chaos Engineering is not as chaotic as you might think; it follows a specific set of principles that make up a workflow. Here’s an overview of those principles:

### Step 1: Define a steady state

Before you start your experiment, you need to gather metrics and set thresholds that signify that your system is in a steady state. Meaning that it’s operating as it should be based on your business goals and standards.

### Step 2: Define a Hypothesis

Once you know what a steady state is, you need to develop a hypothesis of how your system will fail and how it will react to this failure. For example: “If x occurs, the steady state of our system remains stable”:

To control the experiment, you need to determine some metrics. First, system metrics to help you measure the impact of the failure (latency, memory usage, etc.). Second, customer metrics measure the experiment's impact on our end users (error rate, response time, etc.). (Don’t go as far as causing an outage!)

### Step 3: Define the workflow

In the workflow, we define important details, such as:

- The workflow (every step) of your experiment (what stressors will be introduced, how and when)

- How to roll back our experiments in case of major issues

- How to collect key metrics if you don’t already have the right level of observability.

### Step 3: Run the experiment

The last step is self-explanatory: You run your experiment and analyze the results to validate your hypothesis.

If the hypothesis was wrong, you need to resolve potential issues or adjust the hypothesis before rerunning the experiment. If your hypothesis is your desired goal, you may need to run your experiment multiple times before you achieve it.

## Chaos Engineering tools

Multiple tools can be used to run Chaos Engineering experiments, many of which are open source. Here are the most common tools:

- [Chaos Monkey\
  ](https://netflix.github.io/chaosmonkey/)This is the original tool created at Netflix. While it came out in 2010, Chaos Monkey still gets regular updates and is the go-to chaos testing tool.

- [Gremlin](https://www.gremlin.com/)\
  Gremlin helps clients set up and control chaos testing. The free version of the tool offers basic tests, such as turning off machines and simulating high CPU load.

- [Chaos Toolkit](https://chaostoolkit.org)\
  This open-source initiative makes tests easier with an open API and a standard JSON format.

- [Pumba\
  ](https://github.com/alexei-led/pumba)Pumba is a chaos testing and network emulation tool for Docker.

- [Chaos Mesh\
  ](https://chaos-mesh.org/)Chaos Mesh is an open-source cloud-native tool specifically designed for Chaos Engineering with Kubernetes.

- [Mangle\
  ](https://github.com/vmware/mangle)Mangle enables you to run chaos engineering experiments seamlessly against applications and infrastructure components to assess resiliency and fault tolerance.

- [Litmus\
  ](https://litmuschaos.io/)Litmus is an open-source Chaos Engineering Platform that is part of the CNCF landscape.

## Learnings from the expert on Chaos Engineering

I had the chance to interview an early adopter and core contributor of the Litmus Chaos project Sayan Mondal, who started working on the project in 2020. He shared some tips on implementing Chaos Engineering in your project, and we also discussed the Litmus Chaos project more deeply. In this blog post, I thought I’d summarize some key takeaways from our conversation.

If you’d like to watch the full interview, you can find it here: [What is Chaos Engineering?](https://www.youtube.com/watch?v=qLIF8-xGrqc)

### Chaos Engineering is in its early adoption stage in Cloud Native

When you think of Chaos Engineering, you probably think of Chaos Monkey, developed by Netflix, one of the pioneers of Chaos Engineering.

However, we need to say that there are many tools for CE, but we're only in the early adoption stages of cloud-native software development.

Bringing Chaos Engineering into Kubernetes and cloud-native is important, and we're trying to achieve that. Netflix’s idea was to target the whole system and see how resilient it is.

Now we're targeting individual sections and microservices to see what individual issues are and how they singularly affect infrastructure. 

### Chaos Engineering isn’t random

You may think that, due to the name, Chaos Engineering should be random and chaotic. But it couldn’t be further from the truth.

You can’t and shouldn’t run random experiments because you can’t learn anything from them. Chaos Engineering is based on specific principles, and you need to have a plan before you start. What’s a steady state? What hypothesis do you want to prove? What should you do with the results?\
Running [Game Days](https://www.gremlin.com/community/tutorials/how-to-run-a-gameday/) is a great way to structure your Chaos Engineering experiments.

Remember the principles of Chaos Engineering, which you can read [here](https://principlesofchaos.org/). But learn more with the [Chaos Engineering](https://www.oreilly.com/library/view/chaos-engineering/9781492043850/) book by Casey Rosenthal and Nora Jones. 

### Base your hypothesis on observability metrics

To formulate your hypothesis, you need to know your system's steady state. One way to decide what a “steady state” is, is to use metrics that you gather thanks to observability already present in your application. These numbers can objectively say what a steady state is.

Without objective metrics, you may find that the definition of a steady state can vary from person to person.

### Run tests first on pre-production

Yes, the main principle of Chaos Engineering says you should run the tests on production. But you should only do this when you're confident your system is resilient.

Sayan recommends injecting the tests in a staging or pre-prod environment with the same setup as your production. Run experiments on the CI/CD pipeline before it goes on to production. Then when you move on to production, do it with a blue/green deployment.

## Learn more about Litmus Chaos

If you want to learn more about Litmus directly from the mouth of one of its core maintainers, watch my interview with Sayan in my YouTube video: [What is Chaos Engineering?](https://www.youtube.com/watch?v=qLIF8-xGrqc)

Subscribe to my YouTube channel to avoid future videos on open source observability and tools.
