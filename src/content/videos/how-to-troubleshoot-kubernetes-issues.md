---
title: "How to troubleshoot Kubernetes issues"
slug: how-to-troubleshoot-kubernetes-issues
category: k8s
tags: [kubernetes, performance-engineering, observability]
youtubeId: 4KOTjVE06BY
publishDate: 2024-07-15
thumbnail: ../../assets/images/k8s-troubleshooting.jpg
description: "A guide to identifying issues related to applications deployed in your Kubernetes cluster."
---

When operating a workload in [Kubernetes](https://isitobservable.io/search?q=Kubernetes), you may encounter issues with your application for various reasons. When this occurs, you’ll need to examine the state of the objects, Kubernetes events, logs, and resource usage to diagnose the issue.

This blog post and [accompanying YouTube video](https://youtu.be/4KOTjVE06BY) will focus on what to look for when addressing issues with your application deployed in a Kubernetes cluster. Specifically, we will examine workload, network, core components, and observability.

## Diagnosing workload issues in Kubernetes

In the Kubernetes world, when deploying workloads, you can encounter issues related to the settings defined in your workload.

But before troubleshooting, let’s go over a few Kubernetes concepts. As explained in the episode about [the power of Kubernetes events](/observability/kubernetes/how-to-collect-kubernetes-events), deploying workloads in your Kubernetes cluster involves specific steps, so let me briefly remind you of the process.

### Deploying workloads in your Kubernetes cluster

When using any CI/CD solutions or simply \`kubectl\`, you're technically sending a JSON payload to your Kubernetes API, asking to deploy some resources. The Kubernetes control plane is hosted in dedicated nodes: the master nodes that will host the essential components of Kubernetes.

![Troubleshooting workflow](~/assets/images/troubleshooting.png)

So everything starts from the API server, which will then forward the request to the control manager, who will look at the request and forward your task to the scheduler.

The scheduler, the control manager, etcd., will turn your manifest file into a real Kubernetes object. In that state, your workload is pending. The Kubernetes control plane seeks an available node to host your resources in this state. This is a perfect mission for the Kubernetes scheduler.

### Common issues during deployment

Your workload could be stuck in that state simply because there are not enough resources left on the node (the requested CPU and memory defined in your workload's container specs).

But it is also simply related to the label selector defined in your workload or a taint/toleration defined that will force looking for specific nodes. Maybe you don't have enough resources left in the filtered nodes.

So, pending is a sign of not finding the right host for your workload.

The simple way of seeing this situation is to see if your pod has a node assigned. If not, it is a sign of an issue when scheduling your workload.

Once a node is assigned, the scheduler will contact the local kubelet on the node, which is responsible for the node's operation. The kubelet will verify that all the necessary dependencies for your workload exist. When I say dependencies, I mean any external Kubernetes objects used in your workload, such as Kubernetes secrets, configmaps, persistent volumes (PV), persistent volume claims (PVC), etc. If any of these dependencies are missing, the process will be stuck at this point. To understand why the pod is not transitioning to the creating state, even after being assigned to a node, you need to describe the stuck pod to obtain more details.

```
Kubectl describe <podname>
```

After that, it progresses to the creating state, where the kubelet pulls the image specified in your manifest. If the image is incorrect or inaccessible, you’ll encounter a Kubernetes failure known as "imagepullbackoff ," your pod will remain in the creating state.

Your pod may contain one or multiple containers and init containers manually defined or injected by a Kubernetes operator. If the init container task is never completed, your pod will be stuck in the creating state during the init phase.

All the containers running in your pods will have an exit code and reason, which you can easily retrieve by running:

```
Kubectl get <pod> -o yaml.
```

For example:

```yaml
containerStatuses:
- containerID: containerd://f97041437e15d00e929e36d4cb6011ca784d35f9de18b06713a651ff48f6dcd7
image: docker.io/istio/proxyv2:1.21.0
imageID: docker.io/istio/proxyv2@sha256:1b10ab67aa311bcde7ebc18477d31cc73d8169ad7f3447d86c40a2b056c456e4
lastState: {}
name: istio-proxy
ready: true
restartCount: 0
started: true
state:
running:
startedAt: "2024-06-15T20:13:25Z"
- containerID: containerd://6c9b294a4928075aa0e6bddc88ab2f8f8516920a4212d0c6380f1c0299990aa5
image: ghcr.io/open-telemetry/demo:1.9.0-loadgenerator
imageID: ghcr.io/open-telemetry/demo@sha256:d6b921eadd76a53993e9e5299a1c00f4718ada737d32452e3e6e3e64abd2849e
lastState:
terminated:
containerID: containerd://4d6f5eaa7f7e4f36c8967ae0332499c32214cbd07ed9ee2ccd6d41db12cf81a3
exitCode: 137
finishedAt: "2024-06-21T20:24:48Z"
reason: OOMKilled
startedAt: "2024-06-15T20:13:25Z"
name: loadgenerator
ready: true
restartCount: 1
started: true
state:
running:
startedAt: "2024-06-21T20:24:49Z"
hostIP: 10.156.0.24
```

You can see here in this example that all the containers have an exit code and a reason.

The reason is the other rich information you use with the pod phase.

### Kubernetes exit codes overview

There are several types of exit codes:

- Exit Code 0: Purposely stopped. This code indicates that the container was intentionally stopped.

- Exit Code 1: Application error. This code signifies that the container was stopped due to an application error or an incorrect reference in the image specification.

- Exit Code 125: Container failed to run error. This code indicates that the docker run command did not execute successfully.

- Exit Code 126: Command invoke error. This exit code is used when a command specified in the image specification can’t be invoked.

- Exit Code 127: File or directory not found. This means a file or directory was not found in the image specification.

- Exit Code 128: Invalid argument used on exit. This code is triggered when an invalid exit code is used (valid codes are integers between 0-255).

- Exit Code 134: Abnormal termination (SIGABRT). This indicates that the container aborted itself using the abort() function.

- Exit Code 137: Immediate termination (SIGKILL). The container was immediately terminated by the operating system via the SIGKILL signal.

- Exit Code 139: Segmentation fault (SIGSEGV). This means that the container attempted to access memory that was not assigned to it and was terminated.

- Exit Code 143: Graceful termination (SIGTERM). This indicates that the container received a warning that it was about to be terminated and then terminated.

- Exit Code 255: Exit status out of range. The container exited, returning an exit code outside the acceptable range, meaning the error's cause is unknown.

Ultimately, all the error codes over 100 show an issue with your cluster's container runtime, either an OOM Killer or simply the container runtime having trouble running the cmd argument defined in your docker file.

So, if your pod is stuck in the creation state, describing or getting the detailed Kubernetes object stored in the Kubernetes API will help you understand what happened during this deployment flow.

Once your pod has been successfully created, you should have an IP allocated and details on which node your pod is currently running again.

Next, you can define readiness and health probes in your pod. Those would be crucial settings that Kubectl will use to understand whether your workload is ready to serve traffic or is currently healthy.

That is why you need to ensure those probes are well configured to avoid side effects from kubelet. For example, if your health probe is failing and you have defined a restart policy to always, then Kubelet will restart your pod because of the behavior of the health probe.

You also need to make sure the probe's timeout is defined correctly. Health probes are impressive features, but if they’re not well configured, they can be almost a disadvantage.

So, if your workload is unhealthy or keeps restarting (and generating a Crashloopbackoff error), that could be a sign of an issue with your readiness probe.

Last, if your application crashes due to an error, it will raise a crashloopbackoff error, and you’ll have to look at the logs and your traces. Anything helping you troubleshoot your application error could be an issue in your application's configuration, or a security policy applied that breaks your application.

If a global security policy has been applied and your workload has been rejected, you usually get a Kubernetes event that helps you understand the reason for the denial.

From this process, troubleshooting your workload requires to have specific observability details:

As you can see, the state and events produced by Kubernetes drive your analysis or observability tools to understand the current root cause of your problem. Receiving the states of the objects and the events is the core concept of observability to troubleshoot a given situation. By the way, the K8sobject receiver (available in the [OpenTelemetry collector contrib](https://github.com/open-telemetry/opentelemetry-collector-contrib)) will specifically share this type of detail.

Then, the actual health of your node. If you can’t schedule your workload on a node, it probably means that your current node does not have the right resources to allocate your workload. So, having the node usage and the details on the request definition of your workload would be crucial to troubleshooting the situation.

Lastly, if you’re facing an application issue, logs become your best friend, so collecting logs would be your life jacket to guide your actions.

## Troubleshooting a networking issue in Kubernetes

When deploying apps in your cluster, you’ll likely add a Kubernetes service to manage networking within the cluster. If you need to expose it in your cluster, you’ll probably do so through an ingress rule, Httproute, or Grpc route using the Gateway API.

Misconfiguring your networking aspect may lead to issues. Common problems with networking usually revolve around defining the correct ports the services will use and how to link them to your pod with targetport.

Remember, your service will act as a load balancer with the various replicas of your workload. A given service can expose several ports; the service's port could differ from the one defined in your pod definition.

One common mistake with services is that they link pods that respect the label selector. If you modify your labels on your workload definition, the networking rule may no longer match the selector defined in your service.

Every time you deploy a service, Kubernetes creates an endpoint. The endpoint links the IP of the pod matching your label selector to the IP of your service. So, if you’re unsure how your pods are linked to your service, you can look at their IPs to ensure they’re listed in the endpoint.

Another aspect of the service is its type. A few projects defined a node port service that allocates a port on the node. However, the number of ports on a given host is limited, so if all the services are configured as node ports, you can reach that limit in one day.

Before investigating your networking issue, try port forwarding on your pod and then on the service to ensure you receive an HTTP response. You want to avoid getting a 404 error.

In the [episode about Cilium](/observability/service-mesh/what-are-cilium-hubble), we discussed how DNS resolution for your pods and services is achieved through endpoints and kube proxy. Each node has a kube proxy or core, defined as DNS. The DNS maps the service name to the IP of the service you created using IP table rules. If your service is sometimes not resolved, it could be a DNS issue or a limitation of IP tables. Remember that one IP address, the name of your service, and the name of a pod are stored as an IP table rule on each node. Each node will have numerous IP table rules in a large cluster with many services.

If your pod and service are responding, you should check for network policies that could be blocking incoming traffic to your service. Reviewing events and logs from your application container can help determine if your application has trouble reaching a specific endpoint.

If there are no network policies in place, you can investigate if any routes have been defined, such as HTTP routes or GRPCRoutes in the case of a service mesh like Istio's destination rules or virtual services. These rules would match a specific API call or endpoint to an existing route to forward the traffic to your service. The service resolution may not be performed correctly if the route is not properly defined.

Additionally, a circuit breaker could block your traffic if you're using service mesh rules like rate limiting or circuit breaker. The good news is that a service mesh will produce logs, so checking the logs for rate-limited services can confirm if this is happening. It's important to collect the logs produced by the sidecar proxy and configure your service correctly to help the service mesh properly identify the protocol used by your application. Configuring the appProtocol on the service helps the service mesh differentiate the logs based on the protocol used. For example, you'll want an HTTP access log for HTTP or GRPC.

When encountering a networking issue, it is crucial to ensure that all the components required to run your network are functioning properly. For instance, if you're using an ingress controller, make sure that the ingress controller pod has not crashed or experienced heavy throttling, which can slow down all the ingress threads. This is also applicable to the sidecar container used for your service mesh.

### Steps to diagnose networking issues

To summarize, when dealing with networking:

1. Start by collecting the IP address of your pod, as well as the IP address of the pod's service. Then, check if the endpoint rule contains both IP addresses.

2. Use port forwarding on the pod and then on the service. This will help you determine whether the issue is related to your service definition or something else.

3. Check the logs and events to identify if a network policy or a service mesh rule has denied your traffic.

4. Ensure that all components of your Kubernetes network are healthy, including the ingress pod and the side proxy container of your service mesh.

5. Again, ensure that your node is healthy and that the Kube proxy did not crash during the incident.

## Core Kubernetes issues

So, what could go wrong with Kubernetes itself?

![Kubernetes server architechture](~/assets/images/kubernetescore.png)

First, if your API server is saturated, all components interacting with it will slow down. This means that your deployment requests, the operator rules or apps that require access to specific components through the Kubernetes API, and your auto-scaling rules will fail.

Next, you may encounter issues with etcd, which could be unhealthy. This would be the worst-case scenario because etcd is the most critical component. Kubernetes stores the status of all your Kubernetes objects, and if they're not running, nothing will work in your cluster.

Another crucial component is kubelet, which serves as the engine of Kubernetes. It assigns resources to your pod and monitors your workload by interacting with it. If kubelet stops running, this could explain why your pods are not scheduled on a specific node.

If Kubelet stops working, your node won't be ready, and you’ll usually be quickly alerted to this.

The kube-proxy is responsible for DNS resolution. If kube-proxy experiences issues or restarts, you may encounter network disruptions when accessing the services deployed on this node. Similarly, if kube-proxy fails, you should be notified, as it is one of the node conditions for your node.

### Monitoring key Kubernetes components

This emphasizes the importance of reporting key performance indicators (KPIs) for the core component objects of your master node, including kubelet and kube-proxy. For managed Kubernetes clusters like GKE, AKS, EKS, or others, you generally don't have access to your master nodes. The good news is that the Kubernetes API, kubelet, and kube-proxy generate Prometheus metrics.

You can retrieve this data using the following scrape configuration in your collector:

```yaml
          - job_name: kube-proxy
            honor_labels: true
            kubernetes_sd_configs:
              - role: pod
            relabel_configs:
              - action: keep
                source_labels:
                  - __meta_kubernetes_namespace
                  - __meta_kubernetes_pod_name
                separator: '/'
                regex: 'kube-system/kube-proxy.+'

              - source_labels:
                  - __address__
                action: replace
                target_label: __address__
                regex: (.+?)(\\:\\d+)?
                replacement: $1:10249
          - job_name: integrations/kubernetes/kubelet
            bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
            kubernetes_sd_configs:
              - role: node
            relabel_configs:
              - replacement: kubernetes.default.svc.cluster.local:443
                target_label: __address__
              - regex: (.+)
                replacement: /api/v1/nodes/$${1}/proxy/metrics
                source_labels:
                  - __meta_kubernetes_node_name
                target_label: __metrics_path__
            scheme: https
            tls_config:
              ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
              insecure_skip_verify: false
              server_name: kubernetes
              # Scrape config for API servers
          - job_name: "kubernetes-apiservers"
            kubernetes_sd_configs:
              - role: endpoints
                namespaces:
                  names:
                    - default
            scheme: https
            tls_config:
              ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
              insecure_skip_verify: true
            bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
            relabel_configs:
              - source_labels: [ __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name ]
                action: keep
                regex: kubernetes;https
              - action: replace
                source_labels:
                  - __meta_kubernetes_namespace
                target_label: Namespace
              - action: replace
                source_labels:
                  - __meta_kubernetes_service_name
                target_label: Service
```

Both kubelet and kube-proxy generate logs in journald. You could utilize the journald receiver in the OpenTelemtry collector to collect these logs. However, this method requires journald to be installed on the node; it might not be possible in a managed environment. So, it may not be a viable option.

While I didn't mention it earlier, monitoring your worker nodes to ensure they’re not running low on CPU memory and adhere to the node conditions specified in the resource information, networking, and more is crucial. If your node does not meet these conditions, it could indicate an issue with your worker nodes.

## Observability to diagnose Kubernetes issues

Most observability backends, Dynatrace, NewRelic, and others, usually collect data exposed by the Kubernetes API to get the inventory of objects, your nodes, and the CPU and memory usage of your pod and nodes. By getting the detailed object, you usually get the status, the phase, and the conditions of the objects. Again, this condition will be reported by the solution to drive the analysis of your situation.

If you’re using an OpenTelemetry collector, you’ll need to use two receivers: the k8cluster, which gives you high-level details, and Kubernetes objects, which will send the actual JSON definition of all objects stored in etcd.

In kubelet, you usually have the cAdvisor metrics reporting the container usage of your pods. cAdvisor is the best data source on memory usage and CPU usage because you would have details on throttling. Moreover, it gives you not the usage of the pod but the usage of your containers running inside your pods. So, collecting the metrics exposed by kubelet and the cAdvisor will give you the correct details.

Last, it is the events and logs of your workload. The events drive your troubleshooting experience, and the logs help you understand the application issue that could be responsible for your issue.

So, by collecting the inventory, usage, and logs, you can clearly understand a given situation without running a cmd line command.

### Automating troubleshooting with workflows

If your observability solutions offer automation, you imagine a workflow that will alert the right team on a given issue so that you could trigger this based on a specific Kubernetes event. In my case, I’ll generate a workflow in Dynatrace that will be triggered on Kubernetes events related to workload, so I’m intentionally excluding the namespace, cluster, and node events.

I ensure that the event includes specific details, such as the team responsible for the application and the number of issues detected in the last few minutes. Once I have this data, I process it and take different actions based on the reason for the event:

![Troubleshooting k8s workload](~/assets/images/k8s-workload.png)

1. If it is a Backoff event, it could be due to an application crash or related to a health probe. In this case, I’ll compile the list of backoff events associated with the unhealthy workload.

2. If it is a scheduling issue, I’ll gather additional information, such as later requests, memory data, and the scheduled node (if available). The generated message will vary depending on whether a node is involved.

3. Any other issues will be categorized as "others." I’ll simply use the event message to inform the team about the problem.

This automated workflow is designed to send a preliminary issue analysis to the relevant team. If the issue is a CrashLoopBackOff, I’ll display the logs observed during the event detection. If it is related to an unhealthy load, I’ll emphasize that the health probe is poorly defined and suggest checking the traces from the health check (if available).

![Slack message of K8s TroubleShooting Assistant](~/assets/images/slackworkflow.png)

Please note that the workflow was not yet completed when the video was recorded and this blog post was written. However, there is a [dedicated GitHub repository](https://github.com/isItObservable/K8STroubleShoting) with all the necessary assets, including the workflow and a specific dashboard on the kube-proxy, API server, kubelet, and more.

## Wrapping up

Troubleshooting issues in a Kubernetes environment can be complex, involving multiple layers such as workloads, networking, core components, and observability. You can effectively diagnose and resolve issues by understanding the deployment process and examining Kubernetes events, logs, and resource usage. Remember to check for common workload issues, ensure correct network configurations, and monitor core Kubernetes components like kubelet and kube-proxy. Utilizing observability tools to collect and analyze data will greatly enhance your troubleshooting capabilities, allowing you to maintain a robust and healthy Kubernetes cluster. For further insights and automated workflows, refer to the resources provided in our GitHub repository.

## Go deeper

- [Visit the GitHub repository on Kubernetes troubleshooting](https://github.com/isItObservable/K8STroubleShoting)
