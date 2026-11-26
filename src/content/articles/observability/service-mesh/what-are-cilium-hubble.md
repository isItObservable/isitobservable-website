---
craftId: 213875
title: What are Cilium and Hubble?
headline: What are Cilium and Hubble?
subline: Cilium is an open source software for providing, securing, and observing network connectivity between container workloads.
date: 2022-11-11T01:30:00Z
author: giulia-di-pietro
topics:
  - service-mesh
  - istio
  - kubernetes
  - linkerd
  - cilium
  - ebpf
image:
  src: ~/assets/images/cilium_v3.png
  title: What are Cilium & Hubble - With Thomas Graf
  alt: null
youtube: https://youtu.be/H5RqSAX-eo4
related:
  - observability/kubernetes/how-to-observe-your-network-with-ebpf
  - observability/service-mesh/what-is-servicemesh-and-specially-what-is-istio
  - observability/kubernetes/how-to-collect-kubernetes-events
  - observability/kubernetes/how-to-collect-logs-with-fluentd
  - observability/service-mesh/what-is-linkerd-and-can-you-observe-it
  - observability/prometheus/what-is-the-value-of-the-kubecost
goDeeper:
  - text: View the tutorial on CIlium and Hubble on GitHub
    url: https://github.com/isItObservable/cilium-hubble
  - text: Learn more about eBPF
    url: https://www.youtube.com/watch?v=jM3vL2LLm5o
---

This blog and YouTube Channel have already covered many topics related to [Kubernetes](https://isitobservable.io/search?q=Kubernetes) and [Service mesh](https://isitobservable.io/search?q=Service%20mesh). Today, we will focus on a Service mesh platform that manages your network using [eBPF](/observability/kubernetes/how-to-observe-your-network-with-ebpf) technology: [Cilium](https://cilium.io/).

Before I introduce Cilium, I’ll shortly describe how networks are managed in Kubernetes. Then I'll explain how Cilium works, how it supports service meshes, what Hubble is, and how it works together with Cilium. In the end, I will wrap it up with a tutorial.

## How networks are managed in Kubernetes

Our vanilla Kubernetes cluster provides a networking layer that allows us to expose our pods using services. Referring to a service instead of a pod makes more sense because pods are ephemeral and can be destroyed.

As you probably already know when you deploy a service you specify a selector that will match all the pods of your service. Once the service is created, Kubernetes also creates an endpoints object that will match the various pods of your services with their IP. Endpoints are important because the Kube proxy utilizes the information to create the right networking rule.

Kube-proxy is a crucial component running on each node of your cluster, routing the traffic to the right pods and IP addresses. It runs on the node, creating one iptable rule per service. The iptable rule takes the service IP and port to redirect the traffic to one of the pod's IP. For each endpoint, Kube-proxy installs iptable rules helping to select the right pod. Kube-proxy relies on the readiness probe to determine the right backing pod to serve.

How does K8s resolve the name of our services with the various IP tables created by Kube-proxy? It uses Kube-DNS, which is most likely a core DNS with one DNS rule per service.

And then Kube-proxy resolves the service name into the right IP address.

With this mechanism, any pods of your cluster can access any service except if we filter the traffic by creating NetworkPolicy rules.

The standard NetworkPolicy only allows you to apply a rule on IP and port. You can lock or unlock access to a given service but can't allow access to a limited HTTP endpoint.

As explained, Kubernetes networking relies a lot on iptables. Iptables is a core technology to manage the networking of your service, but it has an impact once you start having a large number of services deployed in your cluster (meaning lots and lots of iptable rules on each node of our cluster). From that particular moment, iptables could be one of the bottlenecks for your cluster. So how can you resolve this? One option is to rely on eBPF.

If you're new to eBPF, watch my previous episode on this technology on [YouTube](https://www.youtube.com/watch?v=jM3vL2LLm5o) or read my [blog post](/observability/kubernetes/how-to-observe-your-network-with-ebpf) about it.

## What is Cilium?

Cilium is an open source project that provides networking, security, and observability in your cloud-native environment, like Kubernetes. With the help of eBPF, Cilium can inject network and security policies without changing your application code.

You can use the Cilium CLI or the helm chart to deploy Cilium.

Deploying Cilium requires you to add the right taints to your nodes to force any workload to wait for the Cilium agent:

node-taints node.Cilium.io/agent-not-ready=true:NoExecute

And to disable the default Container Network Interface (CNI).

Once Cilium is deployed, you'll have several components that will manage the network in your cluster:

- A Cilium Agent deployed as DaemonSet.

  Each node will have Cillum that injects BPF programs to look at the node's network interface and each Container deployed in the node

- The Cilium operator that manages the various policies that apply in your cluster

- The Cilium node init that runs as a daemonset handling tasks like mounting the eBPF filesystem and updating the existing CNI plugin to run in ‘transparent’ mode

- The Cilium CNI plugin that triggers the necessary datapath configuration to provide networking, load-balancing, and network policies for the pods

Once Cilium is deployed, you can start managing the network policy of your cluster using a CRD provided by Cilium:

```
CiliumNetworkPolicy
```

With CiliumNetworkPolicy you can authorize traffic of a given pod based on the label selector and select the pod/pods that are targeted by the rule.

For example, if I want to authorize all the pods from the hipster shop to send their spans to the OpenTelemetry collector deployed in the default namespace and the collector has the label component: collector, I could create the following rule:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-ingress-from-oteld
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      component: otel-collector
  ingress:
    - fromEndpoints:
        - matchLabels:
            io.kubernetes.pod.namespace: hipster-shop
      toPorts:
        - ports:
            - port: "4317"
```

Here it means that only the pods from the hipster-shop can send traffic to my openTelemetry Collector.

The CiliumNetworkPolicy can even specify the egress rule if the pod needs to contact a service out of the cluster. We can authorize the communication to a specific domain name.

In our example, my collector will export the spans to Dynatrace, so I could even adjust the rule as follows:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-ingress-from-oteld
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      component: otel-collector
  ingress:
    - fromEndpoints:
        - matchLabels:
            io.kubernetes.pod.namespace: hipster-shop
      toPorts:
        - ports:
            - port: "4317"
  egress:
    - toFQDNs:
        - matchPattern: "*.live.dynatra.com"
```

Cilium allows you to create a rule based on the application layer by specifying the authorized HTTP endpoints, Kafka topics, query allowed to send to Cassandra, and Memcache request.

For example, with OpenTelemetry:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-ingress-from-oteld
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      component: otel-collector
  ingress:
    - fromEndpoints:
        - matchLabels:
            io.kubernetes.pod.namespace: hipster-shop
      toPorts:
        - ports:
            - port: "4317"
          rules:
            http:
              - method: "POST"
                path: "/api/v1/traces"
  egress:
    - toFQDNs:
        - matchPattern: "*.live.dynatra.com"
```

For more information, I would recommend looking at [Cilium’s documentation](https://docs.cilium.io/en/stable/#getting-started).

The standard version of Cilium includes a few CRDs:

- The CiliumClusterwideNetworkPolicy

- The CiliumEndpoint

- The CiliumExternalWorkload

- CiliumIdentity

- CiliumNetworkPolicy

- CiliumNode

You will mainly use CiliumNetworkPolicy and CiliumClusterWideNetworkpolicy.

The CiliumClusterWideNetworkPolicy is similar to the CiliumNetworkPolicy except it targets the entire cluster. Instead of selecting pods based on labels, you select nodes.

Cilium automatically creates CiliumEndpoint. One CiliumEndpoint is created for each service managed by Cilium, with the same name, and in the same namespace. In fact, you can also see the various Cilium endpoints by using the Cilium CLI. Cilium will also create a CiliumNode for each Node managed by Cilium. Cilium also manages all the services that are configured with hostnetwork: false.

Cilium provides many advanced networking features to manage your cluster but requires you to enable extensions in Cilium (bandwidth management, egress gateway, cluster mesh, and more).

There is also an option to replace Kube-proxy with Cilium.

Each advanced networking feature will be required to enable a specific extension when deploying it with helm.

Once the extension is deployed it also provides extra CRDs to manage the [bandwidth management](https://docs.cilium.io/en/v1.12/gettingstarted/bandwidth-manager/), the [egress gateway](https://docs.cilium.io/en/v1.12/gettingstarted/egress-gateway/), the cluster mesh (to manage several clusters within the same network), and more.

## The Cilium service mesh

Cilium supports ingress, among other network support. To enable it, you are required to disable the Kube proxy fully and deploy Cilium with the mode

```
kubeProxyReplacement=stric
```

To disable it in an existing managed cluster you'll need to:

1. Delete the daemonset Kube proxy

2. Delete the config map Kube proxy (in the event that it runs after a cluster upgrade)

3. Back up the iptables in each of your nodes.

In a cluster managed by a cloud provider, you won’t be able to disable the Kube proxy easily. That is the reason GCP, AWS, and others provide options to create clusters with Cilium enabled.

Once Cilium is properly configured, you can also deploy the ingress extension delegating the ingress implantation to Cilium. We would then be able to define the ingress rules with the ingress class name: Cilium.

In the end, with the Kube proxy replacement and the ingress enabled, Cilium can cover the following features:

- Network filtering

- Loadbalancing

- Ingress

- And observability

As previously explained in the introduction to service mesh, a service mesh provides several features: traffic split, observability, circuit breaker, rate limit, retry logic, and more.

Cilium has two service mesh modes: with sidecar proxy or without. To enable proxying without a sidecar, you'll need to enable Cilium ingress support and add the extra config of the envoy. Once deployed, Cilium will provide one envoy per node, and a new CRD allowing you to define proxy rules directly on the envoys.

```
CiliumEnvoyConfig
```

Here is an example of CiliumEnvoyConfig:

```yaml
apiVersion: Cilium.io/v2
kind: CiliumClusterwideEnvoyConfig
metadata:
name: envoy-lb-listener
spec:
services:
- name: echo-service-1
namespace: default
- name: echo-service-2
namespace: default
resources:
- "@type": type.googleapis.com/envoy.config.listener.v3.Listener
name: envoy-lb-listener
filter_chains:
- filters:
- name: envoy.filters.network.http_connection_manager
typed_config:
"@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
stat_prefix: envoy-lb-listener
rds:
route_config_name: lb_route
http_filters:
- name: envoy.filters.http.router
- "@type": type.googleapis.com/envoy.config.route.v3.RouteConfiguration
name: lb_route
virtual_hosts:
- name: "lb_route"
domains: [ "*" ]
routes:
- match:
prefix: "/"
route:
weighted_clusters:
clusters:
- name: "default/echo-service-1"
weight: 50
- name: "default/echo-service-2"
weight: 50
retry_policy:
retry_on: 5xx
num_retries: 3
per_try_timeout: 1s
regex_rewrite:
pattern:
google_re2: { }
regex: "^/foo.*$"
substitution: "/"
- "@type": type.googleapis.com/envoy.config.cluster.v3.Cluster
name: "default/echo-service-1"
connect_timeout: 5s
lb_policy: ROUND_ROBIN
type: EDS
outlier_detection:
split_external_local_origin_errors: true
consecutive_local_origin_failure: 2
- "@type": type.googleapis.com/envoy.config.cluster.v3.Cluster
name: "default/echo-service-2"
connect_timeout: 3s
lb_policy: ROUND_ROBIN
type: EDS
outlier_detection:
split_external_local_origin_errors: true
consecutive_local_origin_failure: 2
```

With the envoy proxy you only have one envoy per node instead of multiple envoys for each pod:

![Cilium envoy proxy](~/assets/images/cilium.jpg)

Otherwise, Cilium provides integration with [Istio](/observability/service-mesh/what-is-servicemesh-and-specially-what-is-istio). This integration allows you to have a slightly different data plane than a regular Istio deployment. Once Istio is deployed, it has control and data planes. The data plane is made of all the Sidecar proxies injected into our workload. All the namespaces having the istio annotation would have the sidecar proxy injected.

The Sidecar proxy envoy injected into our workload uses iptables to route the traffic properly.

With the Cilium integration, you remove the support of iptables and increase the performance of your mesh.

The deployment of the Istio version for Cilium requires using the CLI Cilium-istioctl.

## What is Hubble?

[Hubble](https://hubble.build/) is a fully distributed networking and security observability platform. It is built on top of Cilium and eBPF to enable deep visibility into the communication and behavior of services as well as the networking infrastructure in a completely transparent manner.

Hubble allows you to understand:

- The dependencies between our services by providing a communication map

- How your network is currently behaving

- The level of availability and performance of your services

Hubble comes with:

- The Hubble server deployed has a daemonset, it will collect all the information provided by the Cilium agents. The Hubble server is in fact part of the Cilium agent.

- The Hubble relay that collects all the data from all the Hubble servers

- The Hubble CLI

- A web UI dashboard

## Cilium and Hubble's Prometheus support

Cilium and Hubble provide standard Prometheus support that must be deployed when deploying either.

Once the Prometheus support is enabled each component will produce Prometheus metrics (the various Cilium agents, the Cilium operator, the Cilium-envoy if you enable the envoy support, and Hubble).

When the Hubble Prometheus support is enabled, it creates a new service, the Hubble-metrics, that exposes the Prometheus data.

Cilium updates the various components by adding the right Prometheus annotations:

**For the Cilium agents:**

```yaml
prometheus.io/scrape: true
prometheus.io/port: 9962
```

The Cilium operator:

```yaml
prometheus.io/scrape: true
prometheus.io/port: 9963
```

The Hubble metric service:

```yaml
prometheus.io/scrape: true
prometheus.io/port: 9965
```

Let’s have a look at the type metrics provided by this support.

### The Cilium Endpoint

![Ciliumendpoint](~/assets/images/ciliumendpoint.jpg)

You can keep track of the number of endpoints managed by Cilium and the time to regenerate the endpoints.

### Cluster health

**Unreachable\_nodes =** Number of nodes that can't be reached

**Unreachable\_health\_endpoints =** Number of health endpoints that can't be reached

### Node connectivity

**Node\_connectivity\_status =** observed status of connectivity between the current Cilium agent and other Cilium nodes

**Node\_connectivity\_latency\_seconds =** latency between the current Cilium agent and other Cilium nodes in seconds

### Clustermesh

The data allowing you to report the number of nodes in the cluster mesh, the readiness status, the number of nodes in failure

### eBPF

The metrics reporting the number of calls to the BPF maps, the memory consumed by the BPF programs, the duration of latency of the BPF syscalls, and more.

### Drops/Forwards (L3/L4)

Reporting the number of packets forward, dropped

### Identity

Reporting the number of identities.

### Policy

For l3/L4 policies we can report the number of policies loaded, and the status of each policy. for L7 policies ( HTTP or Kafka) we can report the redirect, the number of requests..etc.

### API rate limit of the Cilium

The number of the request process, the current rate limit settings, the wait duration..and more

### About the operator

With the operator, you can keep track of the number of allocated IPs, and the number of nodes having issues allocating an address. All the metrics from the operator and the agent allow you to keep track of the health of the Cilium core components.

Hubble will help you report metrics related to the traffic managed by Cilium…similar to metrics provided by service mesh.

## Tutorial

In this tutorial, we will deploy Cilium, Hubble, and the Istio integration. We will build a few networking policies and configure Istio to expose our application. And then explore the observability provided by Cilium, Hubble, and Istio.

For this tutorial, you will need:

- A k8s cluster

- Cilium

- Hubble

- The Cert manager

- The OpenTelemetry operator

- A Dynatrace Tenant

- A version of the online boutique fully instrumented by the OpenTelemetry community

Follow the full tutorial on my YouTube channel: [What are Cilium and Hubble - with Thomas Graf](https://youtu.be/H5RqSAX-eo4)

Or on GitHub: [https://github.com/isItObserva...](https://github.com/isItObservable/cilium-hubble)
