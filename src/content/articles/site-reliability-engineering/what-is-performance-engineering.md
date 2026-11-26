---
craftId: 141855
title: What is performance engineering?
subline: Performance engineering is an overarching term to describe a series of tests that ensure that a system or an application is stable and performant.
date: 2022-05-13T00:30:00Z
author: giulia-di-pietro
topics:
  - site-reliability-engineering
  - performance-engineering
image:
  src: ~/assets/images/perfengineering.png
  title: What is Performance Engineering? with Paul Balogh
  alt: null
youtube: https://www.youtube.com/watch?v=mktytGkfVdo
related:
  - site-reliability-engineering/getting-started-with-sre-part-2
  - site-reliability-engineering/get-started-with-sre-part-1
  - site-reliability-engineering/what-is-chaos-engineering
  - open-telemetry/traces/how-to-instrument-your-code-using-opentelemetry
  - open-telemetry/traces/a-short-guide-to-opentelemetry
  - site-reliability-engineering/how-to-create-chaos-experiments-with-litmus
---

On this [blog](/__home__) and [YouTube channel](https://www.youtube.com/c/IsitObservable), we have covered some SRE and performance engineering topics, but we haven’t talked about load testing yet.

There are multiple tools (both open source and commercial) that you can use for load testing, and we will cover them in later episodes, but today we will focus on what is Performance engineering.

## Introduction to performance engineering

Performance engineering used to be called “performance testing” before most organizations started implementing Agile and DevOps methodologies. 

### What is the purpose of performance engineering?

The main objective of [performance engineering](https://www.dynatrace.com/resources/ebooks/javabook/performance-engineering/) is to ensure that a system or an application is stable and performant.

To do this, you run various tests that help you validate a hypothetical situation that we may need to face in production.

Each test you plan on running should cover a specific risk or situation, i.e. if you’re in charge of a CRM platform, you may want to test the recurrent morning situation where all call centers are connected to the systems.

### What does a performance engineer do all day?

The work of a performance engineer includes:

- Being involved in the design of the architecture

- Identifying performance and stability risk related to an application

- Translating each risk in tests that need to be executed on your project

Of course, the performance engineer can't manage all the tests of an organization, so there are many tools to automate the process and offer solutions to allow teams to run performance self-service.

### Types of performance tests

Let’s briefly have a look at the different types of performance tests:

#### Constant load testing

In this test, you run the average amount of traffic against your application to validate the ability to handle the traffic. In this test, you try to target a specific throughput expressed in transaction/s.

For example, if I know that in production, I have, on average, 200 search/s on my website, I'll need to configure my test to be aligned with this target

#### Unit performance testing

This is usually the first test you trigger to measure the performance of a single user. If the response time is unacceptable for one user, it can’t be acceptable for others.

#### Stress testing

In this type of test, you try to stress your system. Usually, this is a technical test to measure the maximum throughput of our system. Stress tests can generate high traffic with a minimum think time (time between two transactions, i.e., the time a user takes to read or fill a form).

#### Ramp Up testing

This testing aims to understand how your application scales, how it validates if your load balancers are well-configured and that your elasticity mechanism is working as required.

#### Soak testing

This test is designed to run a constant load for a very long duration (8, 24hrs, or more). This test aims to detect memory leaks or network connectivity issues.

### Implementing performance engineering

Performance used to be the last-mile activity in projects. An application needed to be designed and deployed in a representative environment before you’d start thinking about performance.

However, this approach doesn’t make sense anymore today. Applications are composed of components and microservices, so you don’t need to wait until the UI is finalized to start testing. Every component can be tested independently and, in the end, the complexity of your tests depends on the environment.

In the development environment, you focus on tests validating code's robustness by running component-level tests (one service, same load, etc.) and fish for regressions between two commits. So, in the end, we're running the same test every day to detect potential regressions.

Once you move to the stage, you want to start running tests that verify how the different components interact with each other and validate that the communication is not introducing any performance issues. For example, you could run stress, soak, or ramp-up tests.

Closer to production, you should have a representative environment that includes all end-users constraints, for example, the network condition of the user. Here you could run tests outside of your network (from the cloud, for example) and measure the actual UX of the user by simulating real browser or mobile devices

### Building performance tests

Building performance tests require you to identify the load pattern that reflects possible future production situations (# concurrent users, think time, # of transactions) and the types of user flows. If you select the wrong user flow, you'll test something that will never reflect production.

The user flows need to be scripted, and you need to ensure that they're robust and don't generate errors or exceptions in your environment. Having a large dataset is important to ensure you’re running a realistic test.

Then, you’ll want to automate your tests in the future. So, you'll need to define SLI/SLOs and SLAs to help you prove that this test has provided suitable results.

Lastly, you need observability. If you're taking time to build your test, ensure you're collecting the right details to help you troubleshoot and understand the potential root cause of your performance issues.

## Tooling for performance engineering

Performance engineering requires specific tooling to help you simulate your expected traffic.

### Commercial tools

There are many commercial tools, for example:

- [**Microfocus LoadRunner**](https://www.microfocus.com/en-us/products/loadrunner-professional/overview)

- [**Tricentis Neoload**](https://www.tricentis.com/products/performance-testing-neoload/)

- [**Loadninja**](https://loadninja.com/)

- [**Eggplant Performance**](https://www.eggplantsoftware.com/products/performance-and-load-testing)

### Open source tools

And there are also many open source tools available:

- [**Jmeter**](https://jmeter.apache.org/)

  Several platforms provide SaaS offerings around Jmeter, like Octoperf, Blazemeter, Tricentis Flood and more.

- [**Gatling**](https://gatling.io/)

- [**Locust**](https://locust.io/)

- [**k6**](https://k6.io/) (stay tuned for my next blog post and video, which will be dedicated to k6)

## Learn more about performance engineering

Performance engineering requires significant data to run realistic and meaningful tests. This blog post is a short introduction to what is performance engineering, if you're looking for deep dive content on this topic, I would recommend the following sites:

- [Perfbytes](https://www.perfbytes.com/)

- [SMC Journal](https://smcjournal.com/)
