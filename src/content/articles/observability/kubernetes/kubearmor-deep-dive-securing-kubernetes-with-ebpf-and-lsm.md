---
craftId: 335797
title: "KubeArmor deep dive: Securing Kubernetes with eBPF and LSM"
subline: KubeArmor is an open-source runtime security tool that relies on eBPF to detect suspicious events in your cluster.
date: 2024-11-06T12:39:00Z
author: giulia-di-pietro
topics:
  - security
  - ebpf
  - kubernetes
image:
  src: ~/assets/images/kubearmor-1.png
  title: "KubeArmor Deep Dive: Securing Kubernetes with eBPF & LSM"
  alt: null
youtube: https://www.youtube.com/watch?v=PU1PNrj7oEk
related:
  - observability/kubernetes/master-kubernetes-security-with-tetragon
  - observability/kubernetes/what-is-falco-the-cloud-native-runtime-security-tool
  - observability/kubernetes/how-to-troubleshoot-kubernetes-issues
  - observability/kubernetes/how-to-secure-your-kubernetes-cluster
  - observability/kubernetes/unlock-the-power-of-tracee-real-time-kubernetes-security-with-ebpf
goDeeper:
  - text: View the tutorial on KubeArmor on GitHub
    url: https://dt-url.net/hs03ubs
---

As part of our [Kubernetes security series](/observability/kubernetes/how-to-secure-your-kubernetes-cluster), we recently explained [what Falco is](/observability/kubernetes/what-is-falco-the-cloud-native-runtime-security-tool), [what Tetragon is](/observability/kubernetes/master-kubernetes-security-with-tetragon), how we configure them, and what type of observability data we can get from those agents.

Today, we will focus on another runtime agent relying on eBPF: KubeArmor.

Here’s a quick overview of the contents of this blog post:

- An introduction to the KubeArmor project

- An overview of the CRDs helping us define policies in our environment (kubearmorpolicy, kubearmorhostpolicy, and kubearmorclusterpolicy)

- And how to extend our observability using KubeArmor.

## KubeArmor overview

Like other runtime agents, KubeArmor relies on eBPF to detect suspicious events in your cluster. Depending on your policy, it may also leverage Linux Security Modules (LSMs), such as AppArmor, SELinux, and LSM BPF, to secure your cluster.

KubeArmor will report observability by pushing process, file, network, or capabilities usage events if enabled.

### KubeArmor architecture

KubeArmor comprises various components, such as the daemonset, the operator, the controller, and the kubearmor-relay.

When you deploy KubeArmor, you’ll have the core component that all security agents rely on, the daemonset, which will deploy the BPF probe. This is the most critical component because the person responsible for reporting the events is responsible for applying the proper enforcement.

Then, you’ll have one of KubeArmor's essential elements: the operator. A Kubernetes deployment allows you to turn the KubeArmor events on or off based on annotations and configure our policies. The policies are configured with a new CRD introduced by KubeArmor: kubearmorpolicy.

The actual controller deployment spreads the configuration to the BPF probes running in our cluster.

Finally, there is the kubearmor-relay, where the KubeArmor agents expose events through the gRPC endpoint. The relay server will pull the agent's events using the gRPC protocol. The relay is then responsible for sharing the output in various protocols. If we want to collect events using log agents, we need to modify the relay's settings to generate the events and alerts more explicitly in stdout. I guess it has been turned off for performance reasons, but KubeArmor's “observability” journey is more complicated than the other agents.

### Events in KubeArmor

KubeArmor can produce events from various cluster dimensions to report operations related to processes, files, networks, and last capabilities. Those events would only be produced if turned on. Add the correct annotation to the targeted Kubernetes component to achieve this visibility.

The annotation is Kubearmor-visibility, and the value is the list of dimensions you want to enable, such as file, network, process, and capabilities.

This annotation can be placed in various areas of your cluster, at the pod level, at the deployment level, or at the node or namespace level. Let’s examine the structure of those events.

Here is a process event:

```json
{
  "ClusterName": "default",
  "HostName": "aks-agentpool-16128849-vmss000000",
  "NamespaceName": "default",
  "PodName": "vault-0",
  "Labels": "app.kubernetes.io/instance=vault,app.kubernetes.io/name=vault,component=server,helm.sh/chart=vault-0.24.1,statefulset.kubernetes.io/pod-name=vault-0",
  "ContainerID": "775fb27125ee8d9e2f34d6731fbf3bf677a1038f79fe8134856337612007d9ae",
  "ContainerName": "vault",
  "ContainerImage": "docker.io/hashicorp/vault:1.13.1@sha256:b888abc3fc0529550d4a6c87884419e86b8cb736fe556e3e717a6bc50888b3b8",
  "ParentProcessName": "/usr/bin/runc",
  "ProcessName": "/bin/sh",
  "HostPPID": 2514065,
  "HostPID": 2514068,
  "PPID": 2514065,
  "PID": 3552620,
  "UID": 100,
  "Type": "ContainerLog",
  "Source": "/usr/bin/runc",
  "Operation": "Process",
  "Resource": "/bin/sh -ec vault status -tls-skip-verify",
  "Data": "syscall=SYS_EXECVE",
  "Result": "Passed"
}
```

It returns the process executed, the parent process, the Kubernetes metadata, and the system call type.

Here is a network event:

```json
{
  "ClusterName": "default",
  "HostName": "aks-agentpool-16128849-vmss000001",
  "NamespaceName": "accuknox-agents",
  "PodName": "policy-enforcement-agent-7946b64dfb-f4lgv",
  "Labels": "app=policy-enforcement-agent",
  "ContainerID": "b597629c9b59304c779c51839e9a590fa96871bdfdf55bfec73b26c9fb7647d7",
  "ContainerName": "policy-enforcement-agent",
  "ContainerImage": "public.ecr.aws/k9v9d5v2/policy-enforcement-agent:v0.1.0@sha256:005c1fde3ff8a667f3ac7540c5c011c752a7e3aaa2c89aa335703289ed8d80f8",
  "ParentProcessName": "/usr/bin/containerd-shim-runc-v2",
  "ProcessName": "/home/pea/main",
  "HostPPID": 1394403,
  "HostPID": 1394554,
  "PPID": 1394403,
  "PID": 1,
  "Type": "ContainerLog",
  "Source": "./main",
  "Operation": "Network",
  "Resource": "sa_family=AF_INET sin_port=53 sin_addr=10.0.0.10",
  "Data": "syscall=SYS_CONNECT fd=10",
  "Result": "Passed"
}
```

The operation, data, and resource field will provide different details based on the type of event. Operation is the field defining the source of the event, process, file, and network.

Here is an example of a file event:

```json
{
  "ClusterName": "default",
  "HostName": "aks-agentpool-16128849-vmss000000",
  "NamespaceName": "accuknox-agents",
  "PodName": "discovery-engine-6f5c4df7b4-q8zbc",
  "Labels": "app=discovery-engine",
  "ContainerID": "7aca8d52d35ab7872df6a454ca32339386be755d9ed6bd6bf7b37ec6aaf277e4",
  "ContainerName": "discovery-engine",
  "ContainerImage": "docker.io/accuknox/knoxautopolicy:v0.9@sha256:bb83b5c6d41e0d0aa3b5d6621188c284ea99741c3692e34b0f089b0e74745413",
  "ParentProcessName": "/usr/bin/containerd-shim-runc-v2",
  "ProcessName": "/knoxAutoPolicy",
  "HostPPID": 967496,
  "HostPID": 967872,
  "PPID": 967496,
  "PID": 1,
  "Type": "ContainerLog",
  "Source": "/knoxAutoPolicy",
  "Operation": "File",
  "Resource": "/var/run/secrets/kubernetes.io/serviceaccount/token",
  "Data": "syscall=SYS_OPENAT fd=-100 flags=O_RDONLY|O_CLOEXEC",
  "Result": "Passed"
}
```

That is the default structure of the events when building a policy. You’ll have similar information, but an Action field will be added to help you understand if it is an alert or a simple blocked event. The action could be either blocked or audited.

It also adds an Enforcer field to indicate the type of solution responsible for this detection: BPFLSM, eBPF monitor, Etc.

The other interesting part is to define policies' default behavior. For example, you could have a policy that allows specific events, but if your namespace has a default behavior defined to block them, then the event would be blocked.

Three annotations are available: kubearmor-file-posture, kubearmor-network-posture, and kubearmor-capabilities-posture, which could be equal to audit or block. These annotations could be placed at the namespace level. There is also a default posture for KubeArmor in general. This could be defined by configuring the operator using a specific CRD: KubeArmorConfig.

```yaml
apiVersion: operator.kubearmor.com/v1
kind: KubeArmorConfig
metadata:
  labels:
    app.kubernetes.io/name: kubearmorconfig
    app.kubernetes.io/instance: kubearmorconfig-sample
    app.kubernetes.io/part-of: kubearmoroperator
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/created-by: kubearmoroperator
  name: [config name]
  namespace: [namespace name]
spec:
  # default global posture
  defaultCapabilitiesPosture: audit|block # DEFAULT - audit
  defaultFilePosture: audit|block # DEFAULT - audit
  defaultNetworkPosture: audit|block # DEFAULT - audit
  enableStdOutLogs: [show stdout logs for relay server] # DEFAULT - false
  enableStdOutAlerts: [show stdout alerts for relay server] # DEFAULT - false
  enableStdOutMsgs: [show stdout messages for relay server] # DEFAULT - false
  # default visibility configuration
  defaultVisibility: [comma separated: process|file|network] # DEFAULT - process,network
  # KubeArmor image and pull policy
  kubearmorImage:
    image: [image-repo:tag] # DEFAULT - kubearmor/kubearmor:stable
    imagePullPolicy: [image pull policy] # DEFAULT - Always
  # KubeArmor init image and pull policy
  kubearmorInitImage:
    image: [image-repo:tag] # DEFAULT - kubearmor/kubearmor-init:stable
    imagePullPolicy: [image pull policy] # DEFAULT - Always
  # KubeArmor relay image and pull policy
  kubearmorRelayImage:
    image: [image-repo:tag] # DEFAULT - kubearmor/kubearmor-relay-server:latest
    imagePullPolicy: [image pull policy] # DEFAULT - Always
  # KubeArmor controller image and pull policy
  kubearmorControllerImage:
    image: [image-repo:tag] # DEFAULT - kubearmor/kubearmor-controller:latest
    imagePullPolicy: [image pull policy] # DEFAULT - Always
  # kube-rbac-proxy image and pull policy
  kubeRbacProxyImage:
    image: [image-repo:tag] # DEFAULT - gcr.io/kubebuilder/kube-rbac-proxy:v0.15.0
    imagePullPolicy: [image pull policy]
```

## KubeArmor policies

If enabled, KubeArmor handles events related to files, processes, and networks. However, if you want to build alerting (to reduce the number of events) or more block-specific behavior, then you would need to configure a KubeArmorPolicy.

Various CRDs help us configure the policy. Technically, it’s the same configuration type but targets different types of objects.

- The KubeArmorPolicy that targets deployments in a given namespace

- The KubeArmoClusterPolicy targets the entire cluster

- The KubeArmorHostPolicy targets a specific cluster node.

Let’s look at the definition of this policy object.

```yaml
apiVersion: security.kubearmor.com/v1
kind: KubeArmorClusterPolicy
metadata:
  name: [policy name]
  namespace: [namespace name] # --> optional
spec:
  severity: [1-10] # --> optional (1 by default)
  tags: ["tag", ...] # --> optional
  message: [message] # --> optional
  selector:
    matchExpressions:
      - key: [namespace]
        operator: [In|NotIn]
        values:
          - [namespaces]
  action:
```

All the policies will have a similar structure, such as a name, but you can assign details related to the alert, a message, a tag, and a severity. The object will have a Selector to limit or filter a specific workload in the case of a kubearmorpolicy or a namespace selector in the case of a cluster policy. Last, the policy has an action field to define what KubeArmor should do with this event: allow it, block it, or simply alert it with an audit.

The policy will define the type of events we’re targeting. Several targets exist: the process, file, network, capabilities, and last syscalls.

Each section will specify the right combinations of filters by defining a rule on a file path, process, networking actions, or syscalls that would like to be alerted (or blocked), and each has its filtering section. Here’s an example:

```text
process:
  matchPaths:
    - path: [absolute executable path]
      ownerOnly: [true|false] # --> optional
      fromSource: # --> optional
        - path: [absolute exectuable path]
  matchDirectories:
    - dir: [absolute directory path]
      recursive: [true|false] # --> optional
      ownerOnly: [true|false] # --> optional
      fromSource: # --> optional
        - path: [absolute exectuable path]
  matchPatterns:
    - pattern: [regex pattern]
      ownerOnly: [true|false] # --> optional
  # --> optional
  action: [Allow|Audit|Block] (Block by default)
```

Here are the various possible filters. We can create a matching rule on the path, directory, or process details. For the file type, there are specific filtering rules:

```yaml
file:
  matchPaths:
    - path: [absolute file path]
      readOnly: [true|false] # --> optional
      ownerOnly: [true|false] # --> optional
      fromSource: # --> optional
        - path: [absolute exectuable path]
  matchDirectories:
    - dir: [absolute directory path]
      recursive: [true|false] # --> optional
      readOnly: [true|false] # --> optional
      ownerOnly: [true|false] # --> optional
      fromSource: # --> optional
        - path: [absolute exectuable path]
  matchPatterns:
    - pattern: [regex pattern]
      readOnly: [true|false] # --> optional
      ownerOnly: [true|false]
```

Here are the network matching rules:

```yaml
network:
  matchProtocols:
    - protocol: [TCP|tcp|UDP|udp|ICMP|icmp]
      fromSource: # --> optional
        - path: [absolute exectuable path]
```

You can limit it to a specific protocol and communication pattern. It’s a bit tricky to set the proper configuration.

Here are the matching rules available for the capabilities:

```yaml
capabilities:
  matchCapabilities:
    - capability: [capability name]
      fromSource: # --> optional
        - path: [absolute exectuable path]
```

And the following one for syscalls:

```yaml
syscalls:
  matchSyscalls:
    - syscall:
        - syscallX
        - syscallY
      fromSource: # --> optional
        - path: [absolute exectuable path]
        - dir: [absolute directory path]
          recursive: [true|false] # --> optional
  matchPaths:
    - path: [absolute directory path | absolute exectuable path]
      recursive: [true|false] # --> optional
    - syscall:
        - syscallX
        - syscallY
      fromSource: # --> optional
        - path: [absolute executable path]
        - dir: [absolute directory path]
          recursive: [true|false] # --> optional
```

Even if it has a variety of settings, a good level of expertise is required before configuring those policies. I suggest turning off all the KubeArmor events and configuring your policies based on the observed events.

KubeArmor does not provide out-of-the-box policies for everyday vulnerable events. However, you can review the existing policy templates in their [documentation](https://github.com/kubearmor/policy-templates).

KubeArmor also has a CLI to interact with the operator and use the command KubeArmor logs to look at the event produced if you have not turned on the stdout logging option. More interestingly, it has an action KubeArmor recommends that could recommend the policies you need to deploy on a given namespace.

## Observability with KubeArmor

Like all security agents, the data produced is designed to help you extend the level of your observability, but it requires some settings to enable logging properly.

### The OpenTelemetry collector receiver

The KubeArmor community has worked on an [OpenTelemetry collector receiver](https://github.com/kubearmor/otel-adapter) to get the KubeArmor events. This is an excellent initiative because you won’t have to enable the stdout settings anymore. The only downside is that the receiver lives in the KubeArmor organization, not the opentelemetry-contrib repo. It would be great if it were submitted upstream so everyone can take advantage of the default contrib version. The major advantage is that we can collect logs from our collector directly by interacting with the agents' grpc interface. The other great advantage is that all the event files would be considered log attributes, simplifying the processing tasks.

### The KubeArmor Sidekick

KubeArmor also worked on a project called [Sidekick](https://github.com/kubearmor/sidekick). Like the FalcoSidekick project, it is designed to collect the alerts retrieved by KubeArmor and push them to several market solutions, such as Slack, Teams, or other observability solutions.

Honestly, this project is not super helpful. Once you have configured the relay server to use a log agent or simply the KubeArmor receiver in our collector, the event produced is not difficult to parse because the structure of KubeArmor events is standard. Falco or Tetragon provide more fields depending on the event, so the way you need to parse depends on the type of event, but in KubeArmor, it is very structured. Any log agent can process all the events with a common rule.

### The Prometheus exporter for KubeArmor

KubeArmor does not have a default Prometheus exporter available. However, when deploying KubeArmor, we have a service named kubearmor-controller-metrics-service, and I have tried to connect to it to scrape metrics from there. Still, it requires a specific TLS setting to work.

Otherwise, in the Kubearmor repo, [a project provides a Prometheus exporter](https://github.com/kubearmor/kubearmor-prometheus-exporter) that will expose metrics. Again, this project connects to the Kubearmor agents, like the relay server, and produces metrics out of the alerts.

Because the relay server seems to do the same, it would make sense to connect it to the relay server to reduce the pressure we could put on the agents.

The metric exposed in this exporter does not add more details than the one already available in the logs. If you collect the logs, the metrics would have a limited value except for reducing the data we need to ingest.

I found no metrics or data to help us measure the health of the KubeArmor agents and operators, which is disappointing. This is missing crucial information. We want to report security events, but we also want to ensure that KubeArmor is healthy.
