---
craftId: 338557
title: "Say Goodbye to Cluster Autoscaler: Meet Karpenter for Kubernetes Scaling"
date: 2025-01-21T06:28:00Z
author: giulia-di-pietro
topics:
  - kubernetes
  - autoscaling
  - performance-engineering
image:
  src: ~/assets/images/KARPENTER.jpg
  title: "Say Goodbye to Cluster Autoscaler: Meet Karpenter for Kubernetes Scaling"
  alt: null
youtube: https://www.youtube.com/watch?v=THj__UYiq90
related:
  - observability/kubernetes/how-to-autoscale-in-kubernetes-and-how-to-observe-scaling-decisions
  - observability/kubernetes/introducing-event-driven-autoscaling-with-keda
goDeeper:
  - text: Go to the Karpenter Tutorial on GitHub
    url: https://dt-url.net/wm03w47
seo:
  description: This blog explores the limitations of traditional Kubernetes scaling options, introduces Karpenter, and provides insights into its key features and benefits, including the data it exposes for observability.
---

Autoscaling plays a crucial role when designing reliable and performant workloads in Kubernetes. Horizontal Pod Autoscaler (HPA) and Vertical Pod Autoscaler (VPA) are popular Kubernetes-native solutions to manage scaling, but they aren’t perfect. They can quickly consume additional resources, are limited in metrics compatibility, and often require advanced configurations to optimize usage. This is where Kubernetes users might seek alternatives for better scalability and efficiency.

This blog explores the limitations of traditional Kubernetes scaling options, introduces [Karpenter](https://karpenter.sh/), and provides insights into its key features and benefits, including the data it exposes for observability.

## Why is autoscaling in Kubernetes challenging?

A few months ago, I released an episode explaining [how to autoscale our workload in our Kubernetes cluster](/observability/kubernetes/how-to-autoscale-in-kubernetes-and-how-to-observe-scaling-decisions) using a Horizontal Pod Autoscaler (HPA) or a Vertical Pod Autoscaler (VPA) that covers what you need to know about the native autoscaling capabilities of Kubernetes.

In short, Kubernetes allows us to build smaller instances of our pod and rely on autoscaling to provide more replicas based on the actual load on our pod.

### The downsides of the Horizontal Pod Autoscaler

HPA adjusts the number of replicas based on a KPI, and by default, it will only utilize the metrics available in the metric server: CPU or memory.

Scaling on the CPU or memory is usually not ideal. That is why some projects resolve this challenge by connecting to third party solutions to expose external metrics to the HPA objects (like [KEDA](/observability/kubernetes/introducing-event-driven-autoscaling-with-keda) or [Keptn](/observability/kubernetes/what-is-the-keptn-lifecycle-toolkit)).

### The downsides of the Vertical Pod Autoscaler

VPA scales vertically by adjusting a pod’s CPU/memory allocation. However, this comes with its own challenges.

Before Kubernetes v1.27, VPA had to reschedule a new pod instance with the new CPU and memory settings when scaling was required, causing overhead. However, since v1.27, VPA can adjust the pod's resources directly without rescheduling.

Many users use VPA in recommendation mode, where VPA suggests the request/limits for our pods based on their behavior. VPA does not handle all of our workload, so if you plan to use it for jobs, you should use KEDA instead.

VPA isn’t suited for garbage collectors and workloads with high initial memory allocation at the start-up because it usually stabilizes once the app runs.

### The downsides of the Cluster Autoscaler

We consume or allocate more resources within our nodes if we schedule new pods or change their resource settings. But if we try to schedule a new workload in a cluster where the node has limited resources, it will stay pending. That’s where the Cluster Autoscaler (CA) adjusts the cluster size by adding or removing nodes.

One of the Cluster Autoscaler's first downsides is that it’s only available for AWS and Azure. GKE manages cluster scaling with the GKE autopilot.

CA is excellent but requires a couple of configurations from our cloud provider and many tasks to work correctly.

First, we must create a Managed Node Pool that prevents us from adding various nodes. Within the managed node pool, we need to have the same type of instance from our cloud provider, and then your node pool needs to have its autoscaling group assigned.

If we need to have different types of nodes or nodes with GPUs, we’ll have to define the right management node pool and autoscaling group; otherwise, CA won’t do any magic.

The other disadvantage of CA is that provisioning new nodes to resolve an unscheduled issue can take several minutes, even closer to 10 minutes. Why does it take so long?

If the new pod is scheduled and stuck in a pending state, CA sees it and reaches out to the autoscaling group API, which reaches out to the managed node pool and then through the EC2 instance. Several API calls are made to request a new node.

## What is Karpenter?

Karpenter was created to resolve all those aforementioned challenges and more. Karpenter, initially developed by AWS, is an open source Kubernetes node lifecycle management tool. Its goal is simple yet powerful: to improve cluster efficiency, scalability, and provisioning speed.

Karpenter dynamically provisions just the right nodes and optimizes cluster resource usage on the fly without relying on pre-configured managed node pools. It can spin up nodes of different sizes, respecting the configuration we shared with Karpenter. It can also decide that instead of having, for example, one heavy node used by a significant number of workloads and one node added for our new pod. It could be consolidated by spinning up one node where our entire workload will be hosted. This consolidation mechanism is amazing for optimizing our cloud provider usage. When triggering a consolidation, it will evict the pod and cut off the node from the cluster while spinning up the new node that will welcome everything.

### Which providers support Karpenter?

Karpenter is naturally supported by AWS and every other provider that supports the cluster API (Azure, Alibaba Cloud, etc.). GKE handles autoscaling with its GKE Autopilot.

Depending on your cloud provider, different requirements exist for utilizing different Karpenter features. Implementing the correct requirements will be the job of the admin/platform engineer.

### How do you deploy Karpenter?

Deploying Karpenter is straightforward, using Helm charts to install it into your Kubernetes cluster. Upon installation, it provides:

- **Kubernetes Metrics** for observability.

- **Automated Node Management** with NodeClaims and NodePools.

- **Provider-Specific Integrations** for AWS, Azure, and Alibaba Cloud.

## CRDs (Custom Resource Definitions) in Karpenter

Karpenter deploys several CRDs:

- NodeClass

- NodeClaim

- NodePool

In this section, we’ll dive into each one of them.

### NodeClass CRD

The NodeClass is the CRD specific to the cloud provider (EC2NodeClass for EC2, AKSNodeClass for Azure, ECSNodeClass for Alibaba Cloud). It’s designed to map the node instance type available within each provider.

The NodePool refers to the NodePool class, allowing Karpenter to interact correctly with the right Cloud provider. NodePool class has many options allowing us also to customize how kubelet should behave by defining:

- The maximum number of pods

- The resources reserved for the system

- The resource reserved for kubelet

- The eviction process

- And more.

For example, for EC2:

```yaml
apiVersion: karpenter.k8s.aws/v1
kind: EC2NodeClass
spec:
  amiSelectorTerms:
    - alias: al2023@v20240807
  kubelet:
    maxPods: 42
```

### NodeClaims CRD

Karpenter completely manages the NodeClaims, we will never interact with them, or at least we will never create them. Karpenter will create and delete the NodeClaims depending on the demands of pods in your cluster.

Whenever we have pending pods, Karpenter evaluates the resource requirements with the settings defined in our NodePool and NodeClass and creates a NodeClaim.

NodeClaim is an excellent source of information for understanding what is currently happening within our nodes managed by Karpenter.

When autoscaling is in process, Karpenter follows specific steps:

1. Create a NodeClaim

2. Reach out to the cloud provider to provision a new node

3. Update the NodeClaims to notify that the type of instance started

4. Once the node is available in the cluster, update the NodeClaim to keep track of the progress

5. Add the correct metadata to our new node depending on the settings that we have defined in the NodePool.

NodeClaims share the entire history of the actions done by Karpenter. To keep track of the progress of the node provision and consolidation, we can simply describe the NodeClaims using kubectl:

```bash
kubectl describe NodeClaim <nodeclaimName>
```

The logs of the Karpenter replicas also contain all the details of the activity. Furthermore, Karpenter will add a Kubernetes event to our pod so we know exactly what is happening with our workload.

In this regard, Karpenter is excellent because when operating a cluster, we can optimize resource usage without sacrificing visibility.

### NodePool CRD

When managing your cluster with Karpenter, you need to define at least one NodePool. There is a default NodePool, but you can create as many NodePools as you want.

In the NodePool you can:

- Assign specific taints or labels to freshly new nodes added by Karpenter (for example, we can create NodePools for particular types of workload of our cluster)

- Define an expiration time. Past this time, Karpenter will drain this node to replace it with a fresh new instance

- Find nodes that respect specific specifications (# of CPU, operating system, etc.) using operators like in or equal in the requirements section.

Here’s an example:

```yaml
spec:
  template:
    spec:
      requirements:
        - key: kubernetes.io/arch
          operator: In
          values: ["amd64"]
        - key: kubernetes.io/os
          operator: In
          values: ["linux"]
        - key: karpenter.k8s.aws/instance-category
          operator: In
          values: ["c", "m", "r"]
          minValues: 2
        - key: karpenter.k8s.aws/instance-family
          operator: In
          values: ["m5","m5d","c5","c5d","c4","r4"]
          minValues: 3
        - key: node.kubernetes.io/instance-type
          operator: Exists
          minValues: 10
        - key: karpenter.k8s.aws/instance-generation
          operator: Gt
          values: ["2"]
```

As you can see, each provider provides their own sets of “keys” to match their specifications.

Here are the keys for [AWS](https://karpenter.sh/docs/reference/instance-types/) and [Azure](https://github.com/Azure/karpenter-provider-azure/blob/main/designs/gpu-selection-and-bootstrap.md).

There is a notion of Minimum Values, which define the number of minimum instances that respect these requirements. So, in our example, we will need two instances. The requirements piece is great because we can focus on the requirements we need instead of being limited to instance names.

The other brilliant thing is placing temporary taints at the node's startup. This is particularly useful when using CNI like [Cilium](/observability/service-mesh/what-are-cilium-hubble), as you can ensure that Cilium gets deployed on the new node before any other workload.

Karpenter also offers a way to control the size of the NodePool by defining limits in terms of CPU, memory, and GPU.

### NodePool example

Here is an example of a NodePool

```yaml
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
name: default
spec:
template:
metadata:
nodes
labels:
billing-team: my-team
annotations:
example.com/owner: "my-team"
spec:
NodeClassRef:
group: karpenter.k8s.aws # Updated since only a single version will be served
kind: EC2NodeClass
name: default
taints:
- key: example.com/special-taint
effect: NoSchedule
startupTaints:
- key: example.com/another-taint
effect: NoSchedule
expireAfter: 720h | Never
terminationGracePeriod: 48h
requirements:
- key: "karpenter.k8s.aws/instance-category"
operator: In
values: ["c", "m", "r"]
minValues: 2
- key: "karpenter.k8s.aws/instance-family"
operator: In
values: ["m5","m5d","c5","c5d","c4","r4"]
minValues: 5
- key: "karpenter.k8s.aws/instance-cpu"
operator: In
values: ["4", "8", "16", "32"]
- key: "karpenter.k8s.aws/instance-hypervisor"
operator: In
values: ["nitro"]
- key: "karpenter.k8s.aws/instance-generation"
operator: Gt
values: ["2"]
- key: "topology.kubernetes.io/zone"
operator: In
values: ["us-west-2a", "us-west-2b"]
- key: "kubernetes.io/arch"
operator: In
values: ["arm64", "amd64"]
- key: "karpenter.sh/capacity-type"
operator: In
values: ["spot", "on-demand"]
disruption:
consolidationPolicy: WhenEmptyOrUnderutilized | WhenEmpty
```

### NodePool disruption configuration

The NodePool disruption configuration is interesting and allows us to define Karpenter's policy to optimize node usage. The basic settings only defines the consolidation policy that could be either equal to WhenEmpty or WhenEmptyOrUnderutilized. If the node is empty or underutilized, Karpenter will try to spin up a different node size to optimize the actual node allocation. We can also define an expiration for the node.

How does it work?

1. It identifies a list of nodes that could be disrupted to determine if they can’t be evicted

2. Once it has the list of nodes, it checks if the nodes selected respect the budget defined in the NodePool

3. It simulates rescheduling the pods on the node to determine whether there would be a replacement and whether a node replacement is required

4. If successful, it will taint the node with [karpenter.sh/disrupted:NoSchedule](http://karpenter.sh/disrrupted:NoScehedule) and spin up the replacement node if required

5. It will wait until all the workload has been moved to the available nodes, and then the nodes will be deleted.

### NodePool budget

The budget lets Karpenter know how many nodes could be disrupted. It can be defined by the number of nodes or a percentage. Depending on the budget, Karpenter will count the total number of nodes that could be disrupted with the following operation:

Nb of disruption = available in the node pool—total nodes eligible to be disrupted—the number of nodes not ready.

Let’s say we have 10 nodes, and Karpenter detects three nodes to be disrupted. This means that the number of nodes is seven, so if we have a budget of two, Karpenter can start the disruptions.

We can fine-tune or budget by applying various conditions, for example, the reason that could be: “empty”, “drifted”, or “underutilized”.

```yaml
disruption:
  consolidationPolicy: WhenEmptyOrUnderutilized
  budgets:
    - nodes: "20%"
      reasons:
        - "Empty"
        - "Drifted"
    - nodes: "5"
    - nodes: "0"
      schedule: "@daily"
      duration: 10m
      reasons:
        - "Underutilized"
```

In this example, we tolerate five disruptions without reason, 20% if empty or drifted, and zero by launching a cronjob daily to remove underutilized nodes. 0 meaning no disruption allowed, and we’re running this the first 10 minutes of the day

To control the workload that we won’t authorize to be disrupted, we can place annotations to our workload:

```yaml
karpenter.sh/do-not-disrupt: "true"
```

And we can also place this annotation on a specific node if we want.

## Observability with Karpenter

In addition to managing our node smartly, Karpenter provides visibility to our cluster.

The NodeClass gets all the tasks triggered by Karpenter in each NodePool, but here, we will need to do a ‘*kubectl describe’* to get everything. Otherwise, Karpenter keeps track of all the tasks in the logs produced by the various replicas of Karpenter. The log is in JSON format, making it easy to parse. It also adds Kubernetes events in the details of the pods where Karpenter has done some actions.

Through this, we can track what is happening in Karpenter's autoscaling/consolidation tasks.

Karpenter has a service exposing Prometheus metrics. The official docs provide more information on the [type of metrics you can export](https://karpenter.sh/docs/reference/metrics/).

## Is Karpenter the right fit for you?

If you’re looking for a highly flexible, efficient, easy-to-implement Kubernetes scaling solution, Karpenter likely holds the key. It solves the common pain points of existing scaling solutions while improving speed and optimization.
