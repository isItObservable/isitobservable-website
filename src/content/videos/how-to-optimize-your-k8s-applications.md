---
title: "How to optimize your K8s applications"
slug: how-to-optimize-your-k8s-applications
category: k8s
tags: [kubernetes, observability]
youtubeId: qaRUDLxWmdY
publishDate: 2022-02-03
thumbnail: ../../assets/images/akamas.png
description: "Microservices and cloud-native technology, together with DevOps and CD, have made it harder than ever to optimize systems to ensure reliability and efficiency."
---

One of the main struggles we're facing nowadays in software development is how to make applications run more efficiently and reliably. The processes and techniques we have been using up until now are not producing the results we're hoping for, so there is a need for specific optimization techniques for our new microservice technologies that also work for [faster releases](https://www.dynatrace.com/solutions/devops/).

Systems behave differently depending on the technological stack they’re built upon:

- Web servers: Apache, Nginx, …

- Application servers: Tomcat, …

- Runtimes: JVM

- Databases: MySQL, Postgres, ...

Each technology has configuration files that adjust the number of authorized number connections, thread, worker, or heap size (in the case of JVM).

Depending on the technology, the system could start slower or faster, consume more or fewer resources and eventually impact the end user.

The main issue is that configuring the environment is usually something nobody considers during the project lifecycle.

We would often just use the default configuration in production. However, settings usually depend on the design, the solution's architecture, and our system's usage. There is no standard for optimal configuration.

If it’s so complex, where do you even start to optimize a system?

## How do you optimize a system like Kubernetes?

Optimizing a system has been a manual task usually considered quite expensive and time-consuming. Since we could spend months or years optimizing the whole system, you need first to define the scope of the optimization: **What is the expected outcome or goal?**

Here are some good examples:

- response time decreased by 100ms,

- memory and cpu usage stable over time..error/s,

- exception rate under 5%

Once your goal is defined, you can start optimizing. (Important tip: don’t start optimizing in production. You never know what consequences changing settings may have on your environment!)

1. To start, you need to have a load-testing project that will reflect a representative production load. (Here, the focus is on validating a given configuration, not stressing the systems. You're not fishing for bottlenecks).

   Building a test reflecting production load is not an easy task because you need to understand precisely how your system is being used during representative production hours, like the user flow, the number of concurrent users, number of transactions/s per key transaction, the user think time ( the pace of the traffic), the network constraints of our users, etc.

2. Build the load testing project using a significant number of data sets to run relevant and realistic tests

3. Make sure that you have enabled enough observability to understand your system.

4. Analyze the result of your load test and determine if it's the baseline of our current system.

Once you have the tests and the benchmark, let’s understand which parameters we could modify in the settings of our software stack.

We just need time to wait and see when we have all the inputs. We can't change all the settings of our system at once. We change a single parameter, run a test, analyze, and compare it to our baseline. And then start again.

It’s an iterative process where we modify, run the test, analyze, compare, and decide.

## What can be optimized in a K8s cluster?

As explained in our [first episode of the Kubernetes series](/observability/kubernetes/collect-metrics-in-kubernetes-cluster), [Kubernetes](https://www.dynatrace.com/news/blog/what-is-kubernetes-2/) relies on a nodes infrastructure. So, depending on the size of your nodes, you can observe issues related to how Kubernetes schedules our workload.

Let’s take an example of a Kubernetes event: OOMKilled.

If we don’t define our requests and limits, Kubernetes could kill our workload, but, more importantly, our application could :

- Provide an unstable experience to the user: higher failure rate.

- Cause unstable response times.

Many horror stories have been shared over the years at Kubecon related to this topic. I recommend you to look at:

- [Kubernetes Failure Stories and How to Crash Your Clusters - Henning Jacobs, Zalando SE](https://www.youtube.com/watch?v=6sDTB4eV4F8)

- [10 More Weird Ways to Blow Up Your Kubernetes - Jian Cheung & Joseph Kim, Airbnb](https://www.youtube.com/watch?v=4CT0cI62YHk)

### Quality of service

If you define requests and limits in the specification of your deployment, then Kubernetes will automatically define **quality of service.**

- If request = limit → guaranteed

- If request \< limit → burstable

- No limit → best effort

#### Requests explained

Requests help us manage node usage and help K8s schedule our workload based on resource usage. So, optimizing our cluster could mean defining the right size of our node and the right request/limits.

There are two small parameters to set on the containers of our pods:

- Request for CPU - expressed in millicore (1000 millicore is one core of your node)

- Request for memory - expressed in bytes

To avoid running into a critical situation, you need to define your requests' value and limits properly.

If the memory is too low, your container might not start. On the other hand, if it’s too high, your resource won’t be efficiently utilized in your cluster (resources allocated but not used).

#### Limits explained

lf limits are not well defined in memory, Kubernetes will kill your pod and throw an OOMkilled event. If the CPU limit is too low, you'll get throttled.

Limits are usually more complicated than requests. Let’s say that limits would be your contract with the hardware of your cluster. They define the max resource authorized for our containers.

Memory is expressed in bytes, so we only need to follow the usage of our container.

CPU is expressed in function time. 1 = 100ms of CPU time. This is more difficult to understand, but it's aligned with how Linux allocates the resources in a container environment. It utilizes cgroups, which use Completely Fair Scheduler (CFS) to set resource limits.

CFS manages CPU allocation using quota and period. A quota defines the maximum CPU time a given task can use during a period. In other words, our pods can only use specific CPU time during a given period. If the pod requires more, it will be throttled until the next period. Each core of our nodes can do 100ms of work in a 100ms period.

#### Example

Let’s look at a quick example to illustrate this technical concept.

We run a pod on a 2 CPU core machine. The pod needs 200ms to complete a given task.

**Case 1**

We assign a limit of 2 cores on our workload, translating to a quota of 200ms. Each core gets 100ms of work in a 100ms period.

Consequence: we don’t have any throttling.

**Case 2**

We increase the number of cores to 4, then each core will take 50ms to execute the task.

Consequence: our program will run 50ms and then be throttled for the next 50ms.

## Cost optimization

One very important area that we should not forget is cost optimization. If we're using a managed cluster, then we probably want to size our node and the number of default nodes to reduce the cost of our environment.

For this, I would like to introduce [Akamas](https://www.akamas.io/), a solution that optimizes a system utilizing Machine Learning to find the best configuration parameters for the software stack automatically.

Akamas automates the performance tuning process. It works in 5 phases:

1. It applies a configuration to the target system (e.g. new values for your pod CPU requests)

2. It runs experiments (performance tests) to measure the benefit of a parameter configuration

3. It gathers performance metrics from your monitoring tools, like Prometheus or Dynatrace

4. It automatically analyzes the performance test to compute a score, based on a goal you can define (e.g. maximize throughput or minimize cloud costs)

5. AI and ML define a new configuration, and the cycle repeats.

### Akamas terminology

Akamas uses specific terminology within its product:

- **System** defines the application, service, micro services, whatever that we want to optimize

- **Component** defines a sub element of the system.

- **Component type** is a blueprint for a component that describes the type. It has a set of parameters, metrics.

- **Parameter** defines a property that Akamas can modify to optimize the system.

- **Metric** is a way to measure a specific behavior in our system.

- **Telemetry** is a software component that allows Akamas to retrieve data from a data source.

- **Workflow** is a set of tasks that Akamas needs to execute to evaluate a configuration.

- **Study** defines an optimization initiative on a given system.

- **Experiment** is an evaluation of a configuration, so the result of a configuration change.

- **Trial** is a repetition of the same experiment to confirm the results and avoid noise.

If we take the Google HipsterShop as an example, the cart service is a component, and its component type is JVM since it’s a Java microservice. We could attach to it all the parameters (settings) available within a JVM. It exposes relevant metrics. A JVM exposes relevant metrics: GC duration, nb thread, thread pool, heap size, etc.

If we want to tune a Kubernetes system based on several components: the pod, the container, and the nodes.

![Kubernetes system components](~/assets/images/kubernetes-components.png)

We define a study on K8s with a couple of parameters:

- **Deployment, pod/container**

  CPU and memory limits and requests\
  Number of replicas

- **Infrastructure nodes**

  Type of cloud instance (the number of cores, amount of memory, etc.)\
  Number of nodes

**Workflow**

- Define a terraform script with the new settings

- Commit script to source version control

- Run the script that will:

  1\. Provision a cluster\
  2\. Deploy Prometheus\
  3\. Deploy our application

- Run load test

**Goal**

- Minimize the overall cost of the application / cluster

- Define our SLOs that the ML will consider in the optimization

  Error rate less than 4%\
  Response time under 2s

To learn more about the architecture of Akamas, please refer to their documentation: [https://www.akamas.io/why-akamas/](https://www.akamas.io/why-akamas/).

## Tutorial: optimizing a k8s application with Akamas

As mentioned before, Akamas is a solution that automatically optimizes your systems to make them run more reliably and efficiently while also saving you costs.

That’s why I wanted to try it out, and what better way to do it if not with the help of [Stefano Doni](https://www.linkedin.com/in/stefanodoni/) himself, CTO of Akamas?

In the tutorial we built together, we will go through the e2e configuration of a study in Akamas:

1. Define a system

2. Create a telemetry

3. Define a workflow

4. Create a study

5. Show study results

Watch the full tutorial here: [How to optimize your K8s cluster with Stefano Doni](https://youtu.be/qaRUDLxWmdY?t=1949)

## Go deeper

- [Akamas Tutorial](https://explore.akamas.io/codelabs/k8s-firststudy/index.html?index=..%2F..index#0)
