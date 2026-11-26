---
craftId: 332695
title: Master Kubernetes Security with Tetragon
subline: Tetragon is a runtime security tool that leverages eBPF to provide real-time security monitoring for your Kubernetes workloads.
date: 2024-10-23T19:00:00Z
author: giulia-di-pietro
topics:
  - security
  - kubernetes
  - ebpf
image:
  src: ~/assets/images/tetragolthumbnail.jpg
  title: "eBPF-Powered Kubernetes Security: A Complete Guide to Tetragon"
  alt: null
youtube: https://www.youtube.com/watch?v=xGcCsIJ5AVU
related:
  - observability/kubernetes/what-is-falco-the-cloud-native-runtime-security-tool
  - observability/kubernetes/how-to-build-and-observe-security-policies-with-opa-gatekeeper
  - observability/kubernetes/how-to-secure-your-kubernetes-cluster
  - observability/kubernetes/how-to-observe-your-network-with-ebpf
  - observability/kubernetes/kubearmor-deep-dive-securing-kubernetes-with-ebpf-and-lsm
  - observability/kubernetes/unlock-the-power-of-tracee-real-time-kubernetes-security-with-ebpf
goDeeper:
  - text: Tetragon GitHub Repository
    url: https://github.com/isItObservable/Tetragon
  - text: Watch the episode about eBPF
    url: https://www.youtube.com/watch?v=jM3vL2LLm5o
---

This blog post is part of the security series, in which we have already covered best practices for [security with Kubernetes](/observability/kubernetes/how-to-secure-your-kubernetes-cluster) and introduced [OPA Gatekeeper](/observability/kubernetes/how-to-build-and-observe-security-policies-with-opa-gatekeeper) and [Falco](/observability/kubernetes/what-is-falco-the-cloud-native-runtime-security-tool). Today, we will focus on the eBPF-based runtime security tool [Tetragon](https://tetragon.io/).

We will cover:

- What Tetragon is

- What are Tracing Policies and how to use them

- And how to extend our observability using Tetragon

Let’s get started!

## Introduction to Tetragon

Tetragon is a project provided by the fantastic Cilium community, which I have covered already in a [previous episode](/observability/service-mesh/what-are-cilium-hubble). The Cilium community is very involved in eBPF, so it's no surprise that Tetragon is the component designed for real-time security observation during the runtime of our k8s workload.

Tetragon can detect many things, such as process execution events, system call activity, I/O activity, network and file access, and more. But it doesn’t stop there. It can react by creating an enforcement action to kill the suspicious event, which is more than just detecting events.

Relying on eBPF will detect kernel events without adding any extra overage to our applications, and the awesome approach is to block kernel operations that could be considered suspicious.

When working on Tetragon, I was mainly thinking about security use cases. However, once I understood its potential, I started using it to collect observability data that I did not have with the traditional Prometheus exporters provided by the Prometheus operator.

So, yes, we can do advanced security enforcement, but we can also extend our observability heavily due to Tetragon's flexibility.

### Tetragon’s architecture

Tetragon is deployed with one operator, an engine, and two services:

1. The Tetragon Operator introduces new CRDs that help us configure and create a new tracking policy.

2. The Tetragon engine is the daemonset that will add the eBPF probes to collect all the kernel events.

3. The two services will mainly expose Prometheus metrics, one for the Tetragon agents and one for the operator metrics.

When it comes to enforcement, Tetragon has a different philosophy from Falco.

Falco is a rule agent, so it works out of the box to help you detect the most common suspicious events. Tetragon, on the other hand, doesn’t have default policies.

From their documentation, the Tetragon community seems to be planning to provide a set of Tracing Policies similar to OPA Gatekeeper, which provides predefined policies that we can choose to deploy.

But even if you have no Tracing policies, Tetragon will report all The Process\_exec and Process \_exit, so you can look at your running processes ending in your cluster.

Tetragon creates a log with the event, which may look like this:

```json
{
  "process_exec": {
    "process": {
      "exec_id": "Z2tlLWpvaG4tNjMyLWRlZmF1bHQtcG9vbC03MDQxY2FjMC05czk1OjEzNTQ4Njc0MzIxMzczOjUyNjk5",
      "pid": 52699,
      "uid": 0,
      "cwd": "/",
      "binary": "/usr/bin/curl",
      "arguments": "https://ebpf.io/applications/#...",
      "flags": "execve rootcwd",
      "start_time": "2023-10-06T22:03:57.700327580Z",
      "auid": 4294967295,
      "pod": {
        "namespace": "default",
        "name": "xwing",
        "container": {
          "id": "containerd://551e161c47d8ff0eb665438a7bcd5b4e3ef5a297282b40a92b7c77d6bd168eb3",
          "name": "spaceship",
          "image": {
            "id": "docker.io/tgraf/netperf@sha256:8e86f744bfea165fd4ce68caa05abc96500f40130b857773186401926af7e9e6",
            "name": "docker.io/tgraf/netperf:latest"
          },
          "start_time": "2023-10-06T21:52:41Z",
          "pid": 49
        },
        "pod_labels": {
          "app.kubernetes.io/name": "xwing",
          "class": "xwing",
          "org": "alliance"
        },
        "workload": "xwing"
      },
      "docker": "551e161c47d8ff0eb665438a7bcd5b4",
      "parent_exec_id": "Z2tlLWpvaG4tNjMyLWRlZmF1bHQtcG9vbC03MDQxY2FjMC05czk1OjEzNTQ4NjcwODgzMjk5OjUyNjk5",
      "tid": 52699
    },
    "parent": {
      "exec_id": "Z2tlLWpvaG4tNjMyLWRlZmF1bHQtcG9vbC03MDQxY2FjMC05czk1OjEzNTQ4NjcwODgzMjk5OjUyNjk5",
      "pid": 52699,
      "uid": 0,
      "cwd": "/",
      "binary": "/bin/bash",
      "arguments": "-c \"curl https://ebpf.io/applications/#...\"",
      "flags": "execve rootcwd clone",
      "start_time": "2023-10-06T22:03:57.696889812Z",
      "auid": 4294967295,
      "pod": {
        "namespace": "default",
        "name": "xwing",
        "container": {
          "id": "containerd://551e161c47d8ff0eb665438a7bcd5b4e3ef5a297282b40a92b7c77d6bd168eb3",
          "name": "spaceship",
          "image": {
            "id": "docker.io/tgraf/netperf@sha256:8e86f744bfea165fd4ce68caa05abc96500f40130b857773186401926af7e9e6",
            "name": "docker.io/tgraf/netperf:latest"
          },
          "start_time": "2023-10-06T21:52:41Z",
          "pid": 49
        },
        "pod_labels": {
          "app.kubernetes.io/name": "xwing",
          "class": "xwing",
          "org": "alliance"
        },
        "workload": "xwing"
      },
      "docker": "551e161c47d8ff0eb665438a7bcd5b4",
      "parent_exec_id": "Z2tlLWpvaG4tNjMyLWRlZmF1bHQtcG9vbC03MDQxY2FjMC05czk1OjEzNTQ4NjQ1MjQ1ODM5OjUyNjg5",
      "tid": 52699
    }
  },
  "node_name": "gke-john-632-default-pool-7041cac0-9s95",
  "time": "2023-10-06T22:03:57.700326678Z"
}
```

The event comprises different sections. Its type is process\_exec or process\_exit. When writing the event, you’ll have the process object, the parent object, the node\_name, and the time of the event. The parent object corresponds to the parent process and the current process. We will find similar details on the parent or the process, such as the binary, the arguments used to launch that process, the pod details, the docker details, the pID, and the uID.

Many useful fields depend on what you want to achieve with this log. That is the reason you may need to configure Tetragon to:

- Export only specific events: process\_exce, exit, and then events related to our tracing policies, so kprobe, uprobe, Tracepoints, and lsm

- Apply events only to a limited namespace

- Lastly, a filter will be defined for the fields exported in the event.

So, I strongly recommend configuring it properly to simplify how you deal with the data produced and to reduce the quantity of data produced by Tetragon.

Tetragon can be configured during the installation or simply by modifying the Config map used by the Tetragon agents. You’ll find the Tetragon-config Cm helping us adjust those settings in the Tetragon namespace.

For example:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tetragon-config
  namespace: tetragon
data:
  debug: "false"
  enable-k8s-api: "true"
  enable-pod-info: "false"
  enable-policy-filter: "true"
  enable-process-cred: "true"
  enable-process-ns: "false"
  enable-tracing-policy-crd: "true"
  export-allowlist: '{"event_set":["PROCESS_EXEC", "PROCESS_EXIT", "PROCESS_KPROBE",
    "PROCESS_UPROBE", "PROCESS_TRACEPOINT", "PROCESS_LSM"]}'
  export-denylist: |-
    {"health_check":true}
    {"namespace":["", "cilium", "kube-system","cert-manager","dynatrace"]}
  export-file-compress: "false"
  export-file-max-backups: "5"
  export-file-max-size-mb: "10"
  export-file-perm: "600"
  export-filename: /var/run/cilium/tetragon/tetragon.log
  export-rate-limit: "-1"
  field-filters: |
    {"fields":"process.binary,process.arguments,process.cwd,process.pod.name,process.pod.container.name,process.pod.namespace,process.flags,process.tid,process.pod.workload_kind,parent.binary,parent.arguments,args,status,signal,message,policy_name,function_name,event,file.path"}
  gops-address: localhost:8118
  health-server-address: :6789
  health-server-interval: "10"
  metrics-label-filter: namespace,workload,pod,binary
  metrics-server: :2112
  process-cache-size: "65536"
  procfs: /procRoot
  redaction-filters: ""
  server-address: localhost:54321
```

You can see in this example that I have filtered out a few namespaces with the following:

```yaml
export-denylist: |-
  {"health_check":true}
  {"namespace":["", "cilium", "kube-system","cert-manager","dynatrace"]}
```

And I have also reduced the fields exported with:

```yaml
  fieldFilters: |-
    { "fields":"process.binary,process.arguments,process.cwd,process.pod.name,process.pod.container.name,process.pod.namespace,process.flags,process.tid,process.pod.workload_kind,parent.binary,parent.arguments,args,status,signal,message,policy_name,function_name,event,file.path"}
```

Field filters provide a syntax that could be used to filter fields based on the type of events, for example:

```
{"fields":"process.exec_id,process.binary, parent.binary, process.pod.name", "event_set": ["PROCESS_EXEC"], "invert_event_set": true, "action": "INCLUDE"}
{"fields":"process.exec_id,process.parent_exec_id", "event_set": ["PROCESS_EXIT"], "invert_event_set": true, "action": "INCLUDE"}
```

You’ll have various types of fields based on the event\_set.

### Enabling options

Another important aspect of the configuration of Tetragon is the various options you can enable. For example:

- Enable-k8s-API: It will add pod details to a Tetragon event, meaning that Tetragon will interact with the Kubernetes API

- Enable process-cred: This will report the credentials details of the process in the process objects

- Enable process ns: This will add the namespace details in the process object, not the namespace notion of Kubernetes, but the actual namespace details of a Linux process.

### Throttling

Throttling can help you generate many events, so it’s very important to set it up properly in Tetragon. To configure it, you need to add extra ARGs (Tetragon daemon sets).

For example, “--cgroup-rate=100,1m” means 100 events within a minute.

Once the throttling is in place, Tetragon will generate throttling events to tell you when it started and ended.

Throttling is great, but you lose details from the moment the events are throttled, and in the case of runtime security, it sounds crazy to suddenly become blind for a few seconds. I would rather prefer to have an option to control the number of similar events reported.

### Events

Before we discuss the tracing policies, it makes sense to look at the various types of events that Tetragon can produce. By default, we will get the process\_execve and process\_exit to capture the process execution and exit.

But Tetragon supports more types of events:

- "PROCESS\_KPROBE"

- "PROCESS\_UPROBE"

- "PROCESS\_TRACEPOINT”

- "PROCESS\_LSM”

Each of those events will be produced when a tracing policy is created.

The difference between those events depends on how you have created the hook point in our kernel. Tetragon offers various ways to use kprobes to listen to specific kernel functions.

This is the easiest configuration, but you must select the kernel function properly to ensure it is compatible with your system. Remember, there are specific kernel functions for arn64 or x64, but usually, in Kubernetes, we should mainly be on x64

Tracepoints are more robust here. You define the type of kernel events that you would like Tetragon to listen to.

Then you have uprobes, where U stands for User space. It is a bit like a kprobe, but here you’ll attach the BPF probe to a userspace function, for example, /bin/bash cat.

I haven’t tested lsm BPF because it needs to be enabled in the environment.

## TracingPolicices in Tetragon

Tetragon provides 2 new CRDs: TracingPolicyNamespaced to target a specific namespace and TracingPolicyApplied to apply tracing policies to the entire cluster.

Both CRDs have similar properties, so let’s cover the TracingPolicy only.

The most complicated part of building the policy is configuring the hook point: What type of events, kernel function, or user-space function should I attach my probe to?

For example:

```yaml
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: "tcp-send-monitoring"
spec:
  kprobes:
    - call: "tcp_sendmsg"
      syscall: false
      args:
        - index: 0
          type: "sock"
        - index: 1
          type: "auto"
      selectors:
        - matchArgs:
            - index: 0
              operator: "NotDAddr"
              values:
                - "127.0.0.1"
```

I have configured kprobes, uprobes, and tracepoints mainly. In this example, you can see that the first property defines the type of hook point: kprobe, tracepoint, or uprobe.

This example may sound more complicated than it is. You need to define the targeted event function, but more importantly, you need to fine-tune the arguments to help Tetragon extract the content.

The most important part is understanding how the kernel is supposed to behave in a given use case, such as receiving or writing a TCP packet. This will help you understand the events or kernel functions to help you in your journey.

First, you should find a way to attach the probe to the right function or event.

In my case, I wanted to collect the number of bytes and the destination of each single container. To do so, you can simply look at /proc/kallsyms by doing cat/proc/kallsyms which will return all the kernel functions.

Then, you’ll have to identify the one that makes sense. In my case, I wanted to tcp\_send related functions.

Cat //proc/kallsyms | grep tcp\_send

And I’m getting a filtered list.

![kernel functions filtered list](~/assets/images/Capture-d’écran-2024-10-22-095633.png)

Once I have the desired function, I need the function definition. These details are crucial for configuring your tracing policy and asking Tetragon to collect data from the function's output.

So you can have these details using :

perf probe --vars tcp\_sendmsg

If you don’t have perf, it’s usually not a big deal; those functions are documented online. See, for example, [this kernel function description](https://www.man7.org/linux/man-pages/man3/sendmsg.3p.html).

This is for a kernel function, but it would be a similar journey for a tracepoint, where you list the category of events:

sudo ls /sys/kernel/debug/tracing/events

![kernel function for events](~/assets/images/Capture-d’écran-2024-10-22-095739.png)

And find the category TCP:

sudo ls /sys/kernel/debug/tracing/events/tcp

![Capture décran 2024 10 22 095812](~/assets/images/Capture-d’écran-2024-10-22-095812.png)

Now, you can get the sub-event for the TCP category.

I don’t have any events for the available tracepoints that will match my use case. However, we could still use the init socket set state to help detect the change of state of a given socket. An interesting event could be the tpc\_restrasmit\_skp, which detects any retransmit situation within my environment. Let’s see how I could use it.

```bash
sudo cat /sys/kernel/debug/tracing/events/tcp/tcp_retransmit_skb/format
name: tcp_retransmit_skb
ID: 2444
format:
     field:unsigned short common_type;   offset:0;   size:2; signed:0;
     field:unsigned char common_flags;   offset:2;   size:1; signed:0;
     field:unsigned char common_preempt_count;       offset:3;   size:1; signed:0;
     field:int common_pid;   offset:4;   size:4; signed:1;
     field:const void * skbaddr; offset:8;   size:8; signed:0;
     field:const void * skaddr;  offset:16;  size:8; signed:0;
     field:int state;    offset:24;  size:4; signed:1;
     field:__u16 sport;  offset:28;  size:2; signed:0;
     field:__u16 dport;  offset:30;  size:2; signed:0;
     field:__u16 family; offset:32;  size:2; signed:0;
     field:__u8 saddr[4]; offset:34;  size:4; signed:0;
     field:__u8 daddr[4]; offset:38;  size:4; signed:0;
     field:__u8 saddr_v6[16];    offset:42;  size:16;    signed:0;
     field:__u8 daddr_v6[16];    offset:58;  size:16;    signed:0;
print fmt: "family=%s sport=%hu dport=%hu saddr=%pI4 daddr=%pI4 saddrv6=%pI6c daddrv6=%pI6c state=%s", __print_symbolic(REC->family, { 2, "AF_INET" }, { 10, "AF_INET6" }), REC->sport, REC->dport, REC->saddr, REC->daddr, REC->saddr_v6, REC->daddr_v6, __print_symbolic(REC->state, { TCP_ESTABLISHED, "TCP_ESTABLISHED" }, { TCP_SYN_SENT, "TCP_SYN_SENT" }, { TCP_SYN_RECV, "TCP_SYN_RECV" }, { TCP_FIN_WAIT1, "TCP_FIN_WAIT1" }, { TCP_FIN_WAIT2, "TCP_FIN_WAIT2" }, { TCP_TIME_WAIT, "TCP_TIME_WAIT" }, { TCP_CLOSE, "TCP_CLOSE" }, { TCP_CLOSE_WAIT, "TCP_CLOSE_WAIT" }, { TCP_LAST_ACK, "TCP_LAST_ACK" }, { TCP_LISTEN, "TCP_LISTEN" }, { TCP_CLOSING, "TCP_CLOSING" }, { TCP_NEW_SYN_RECV, "TCP_NEW_SYN_RECV" })
```

That will return the event description with the various field and their type.  

So, you could imagine configuring your tracing policy with the following:

```yaml
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: "tracepoint-restransmit"
spec:
  tracepoints:
    - subsystem: "tcp"
      event: "tcp_retransmit_skb"
      args:
        - index: 5
          type: "skb"
        - index: 6
          type: "sock"
```

To capture the socket information and the SKB information.  

For kprobes, tracepoints, or uprobes, the critical details will help us finalize the configuration of the trace points. In a specific field for logs named args, you define what Tetragon will extract from the event and add it to the output.  

So, in my example:

```yaml
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: "tcp-send-monitoring"
spec:
  kprobes:
    - call: "tcp_sendmsg"
      syscall: false
      args:
        - index: 0
          type: "sock"
        - index: 1
          type: "size_t"
      selectors:
        - matchArgs:
            - index: 0
              operator: "NotDAddr"
              values:
                - "127.0.0.1"
```

In the example, I’m asking to extract the first and the second parameters from the kernel function. To define the right data, you need to convert the data properly. The most difficult exercise was matching the event and configuring the needed details with their type. Identifying the type of argument is the most difficult part for me, but I guess it should be easier with practice.

Then, the tracing policy has a selector to specify precisely when we want to raise this event. For example, for specific binaries, file paths, or IP addresses.  

The tracing policy has several filters for selectors, which you can view [on the Tetragon documentation](https://tetragon.io/docs/concepts/tracing-policy/selectors/). I have mainly been using matchArgs and matchBinary.

Regarding our TCP example, I could limit the event to a specific IP range. Let’s say I’m not interested in local-host communication:

```yaml
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: "tcp-recv-monitoring"
spec:
  kprobes:
    - call: "tcp_sendmsg"
      syscall: false
      args:
        - index: 0
          type: "sock"
        - index: 1
          type: "size_t"
        - index: 2
          type: "char_buf"
          returnCopy: true
      selectors:
        - matchArgs:
            - index: 0
              operator: "NotDAddr"
              values:
                - "127.0.0.1"
```

I’m using matchArgs, selecting the sock details, and filtering the event on a specific address, in this case, localhost. By default, the details provided by Tetragon, like the binary, the capability, and the Linux namespace, are easy to configure but limit Tetragon's potential a lot.  

Last, we can define an action on the filtered event with the match actions, which allows us to kill the suspicious event. However, we can do more. The Tetragon documentation provides an exhaustive [list of supported actions](https://tetragon.io/docs/concepts/tracing-policy/selectors/#actions-filter).

## Observability with Tetragon

On the observability side, Tetragon lets you build tracepoints reporting things you can’t imagine, such as the number of bytes written or read in a given container. The TCP details anything using your kernel. Tetragon can extend your visibility on security events, but you can also extend the visibility of your container usage. It has not been designed for this, and again, if you’re not applying the correct selector, Tetragon will produce a ton of logs, and this level of detail will come with a price.

But let’s focus on the observability data that Tetragon exposes. As mentioned before, Tetragon provides two services exposing Prometheus metrics: those related to the Tetragon agents and those from the Operator.  

The only downside of the Tetragon metrics is the lack of documentation. You’ll have to do a metric exploration like I did.

 Due to the volume of events produced by Tetragon, sometimes we don’t see the actual errors of our tracing policies configuration in the Tetragon logs. This is where metrics help us by reporting the number of events in error, the tracing policies that have not been loaded, and more.

If we simply look at the metrics produced, many are dedicated to the events of the tracing policies, for example, the size of the data events, the tracing policies loaded, the total event types total, and the number of events per policy. Then, there are specific metrics on the behavior of the Tetragon agent, many related to caches.        

Tetragon [documents all its metrics](https://tetragon.io/docs/reference/metrics/). However, the community could shed more light on the technical metrics, like the cache, that are important for detecting when Tetragon behaves abnormally.

However, the other brilliant thing built by the Tetragon community is the ability to control the cardinality of the metrics because, similarly to the log produced, Tetragon will add many dimensions to our metrics by default.

You can control that by configuring the Tetragon metric filter from Helm or using the Tetragon configuration. You can limit the cardinality to the namespace, workload, and binary, for example:

```
--metrics-label-filter
```

And that’s it for my exploration of Tetragon. Tetragon's eBPF-based approach allows for real-time security monitoring while minimizing overhead, offering a powerful way to detect and react to runtime events. Its flexibility enables us to gather detailed observability data, providing insights beyond traditional metrics solutions like Prometheus. Look out for a future video covering Kubearmor, and if you haven’t already, watch my video on [Falco](https://dt-url.net/6r03uen) to get a different perspective on runtime security.
