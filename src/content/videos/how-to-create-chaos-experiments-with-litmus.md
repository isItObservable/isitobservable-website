---
title: "How to create Chaos Experiments with Litmus"
slug: how-to-create-chaos-experiments-with-litmus
category: cloudnative
tags: [chaos-engineering, site-reliability-engineering]
youtubeId: mwu5eLgUKq4
publishDate: 2022-04-01
thumbnail: ../../assets/images/litmus.png
description: "Litmus is a Chaos Engineering tool developed specifically for Kubernetes and cloud-native."
---

In my previous blog post and video, I discussed what Chaos Engineering is and mentioned many tools you can use to implement this practice in software development. One of those tools is Litmus, an open source project created specifically for cloud-native software and Kubernetes.

If you don’t know what Chaos Engineering is, it is a software engineering practice where turbulent and unexpected conditions are unleashed in a system to test if it can withstand them. You can learn more about it here: [What is Chaos Engineering?](/site-reliability-engineering/what-is-chaos-engineering)

In this blog post, we will specifically look at Litmus Chaos. I'll first explain what the architecture looks like, how it works, and share some best practices for using it. There will also be a practical tutorial, where I’ll show you how to configure an experiment with Litmus.

## Introduction to Litmus Chaos

Litmus is a promising CNCF project that’s recently graduated to the incubation stage. It was specifically designed to be used with Kubernetes-based systems.

Since v2.x, Litmus provides a UI called Chaos Center that helps you configure and schedule experiments.

Litmus Chaos comes with:

- An operator

- Several CRDs that will help us design and deploy our Chaos Experiments.

- Web UI named ChaosCenter to configure:

  - Workflows

  - Experiments

  - Monitoring

  - And more

- Agents to deploy in your cluster to trigger workflows and experiments.

The architecture of Litmus is based on the control and execution planes. The control plane comprises all the components required to run the ChaosCenter. The execution plane is composed of several components that execute experiments in your environment: the agent and the execution stack.

The agent stack is required to trigger experiments against your environment. You would either run experiments on the same cluster as Litmus or trigger experiments on an external cluster.

The agent stack is composed of:

- A controller workflow that triggers workflows specified in the ChaosCenter

- The subscriber that is in charge of receiving the instruction from Litmus

- The Chaos exporter that produces metrics from our experiments in a Prometheus format.

The execution stack in charge of running the designed workflow will trigger the Chaos workflow through the Argo workflow. During the execution of our workflow, several components are created: the experiments, the engine, the runner, and the results.

Litmus comes with several CRDs:

- The ChasWorkflow (argo workflow) that describes the steps of the workflow

- The ChaosExperiment that defines the execution information of the experiments

- The ChaosEngine that holds all the information on how to execute the experiment against our environment

- The ChaosRunner created by the operator that executes our experiments

- The ChaosResult that holds the results of our experiment.

You'll probably configure your first workflow using ChaosCenter, so the configuration of the workflow and the experiments will be managed automatically. Since Chaos Workflow relies on Argo Workflow, we have the freedom to design any custom flow triggering load tests in parallel with experiments.

ChaosExperiment allows you to launch probes that help you measure the steady state of your system and abort experiments if something goes wrong.

### Getting started with predefined experiments in the Chaos Hub

Litmus offers a “Chaos Hub” [ChaosHub (litmuschaos.io)](https://hub.litmuschaos.io/) with 50+ predefined experiments for Kubernetes, Cassandra, Kube AWS, Kafka, CoreDNS, GCP, Azure, etc.

Here are some examples of the predefined experiments you can expect for Kubernetes:

- Experiments for pods

  - Container kill

  - Disk fill

  - Pod autoscaler (test the autoscaling policy)

  - Pod cpu hog exec

  - Pod cpu hog

  - Pod delete

  - Pod dns error

  - Pod dns spoof

  - Pod io stress

  - Pod memory hog

  - Pod network corruption

  - Pod network duplication

  - Pod network latency

  - Pod network los

- Experiments on nodes

  - Docker service kill

  - Kubelet service kill

  - Node cpu hog

  - Node drain

  - Node io stress

  - Node memory hog

  - Node restart

  - Node taint

To run an experiment, you need to specify the target, either a list of pod names or node names or a specific percentage of pods/nodes that the experiment should impact.

The generic Kubernetes experiments give you all the right assets to start testing your K8s settings. For example, if you want to test the impact of eviction, you could utilize the following workflow:

- First, reduce the number of available nodes using the node drain experiment.

- Then, you could stress the nodes left in your cluster by creating a workflow that combines node CPU hog and node memory hog.

- To validate your experiment, you should measure the impact of eviction on our users. So we will trigger a load test having a constant load. The load test won’t be there to apply stress but to measure the response time and failure rate.

## Best practices for using Litmus Chaos

Here are some best practices to consider when using Litmus for Chaos Engineering experiments.

Most of the experiments available in the Chaos Hub, especially the node for Kubernetes, require specifying the pod name, the node name in the experiment's definition.

From a maintenance perspective, it makes sense to avoid specifying pod names or node names in your experiments and refer to the node labels or application labels.

Litmus chaos can be installed in various ways:

- Directly in the cluster that you are planning to test

- In a dedicated cluster for testing tools

You should ensure that the app labels are defined in your desired workload.

If you're using a separate cluster, label your node or deployment correctly to be sure that you only impact your target application and not your neighbor application.

Of course, all the experiments consuming resources on your nodes or pods must be configured to consume available resources. If your CPU or memory settings are higher than the available resources, it will naturally fail your experiment.

**Tutorial**

In this tutorial, we will try to configure the experiments that will help us test eviction's impact on our application.

To be able to achieve this, we will need to:

- Create a Kubernetes cluster

- Label our nodes to separate the “observability” tools from our application

- Deploy the NGINX ingress controller that will help us to expose the application, the ChaosCenter, and Grafana

- Deploy the Prometheus operator

- Deploy Litmus Chaos

- Configure the Ingress controller to expose the ChoasCenter

- Deploy the service monitor to collect the metrics exposed by the ChaosExporter

- Then we will configure several experiments to test our specific event: eviction

Follow these links to get access to the tutorial:

- YouTube video: [How to create Chaos Experiments with Litmus | Litmus Chaos tutorial](https://youtu.be/mwu5eLgUKq4)

- GitHub page: [isItObservable/LitmusChaos: This Project contains all the sources of the tutorial of the episode related to Litmus Chaos (github.com)](https://github.com/isItObservable/LitmusChaos)

## Go deeper

- [View the tutorial on LitmusChaos on GitHub](https://github.com/isItObservable/LitmusChaos)
- [Visit the Litmus GitHub repository](https://github.com/litmuschaos/litmus)
