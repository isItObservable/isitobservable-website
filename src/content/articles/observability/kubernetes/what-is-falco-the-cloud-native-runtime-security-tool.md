---
craftId: 327974
title: What is Falco? The cloud-native runtime security tool
subline: Let's dive into Falco, the preferred Kubernetes runtime security tool of many.
date: 2024-10-07T22:30:00Z
author: giulia-di-pietro
topics:
  - kubernetes
  - security
image:
  src: ~/assets/images/falco.jpg
  title: "Falco: The Secret Weapon for Runtime Security"
  alt: null
youtube: https://www.youtube.com/watch?v=PrxSAF0caHk
related:
  - observability/kubernetes/how-to-secure-your-kubernetes-cluster
  - observability/kubernetes/how-to-build-and-observe-security-policies-with-opa-gatekeeper
  - observability/kubernetes/kubearmor-deep-dive-securing-kubernetes-with-ebpf-and-lsm
  - observability/kubernetes/master-kubernetes-security-with-tetragon
  - observability/kubernetes/unlock-the-power-of-tracee-real-time-kubernetes-security-with-ebpf
goDeeper:
  - text: Visit the tutorial on Falco on GitHub
    url: https://dt-url.net/up03u2g
---

This blog post is part of the security series, where we already covered best practices for security with Kubernetes and introduced the OPA Gatekeeper. Today, we will focus on the runtime part of detecting suspicious activity within our environment. For that, we will focus on [Falco](https://falco.org/).

What we will cover:

- A brief overview of potentially suspicious events that must be detected to secure your k8s at runtime

- Introduction to Falco

- A look at Falcosidekick

- How to enhance your observability with Falco.

## What are hackers trying to achieve once connected to a container?

Once connected to a container, the first thing hackers will try to do is to collect the current security context of our container to understand the type of machine and process running in this container, the environment variables currently available in this container, see the current privileges, identify the kernel capabilities given to the container, and if the machine has high privileges, install the mandatory tools to scan the ports and even sniff the traffic, and, of course, try to search for a password token.

That’s only on the container level. They might also try to interact with the Kubernetes API. If the pod has access to the API, they can simply use curl or kubectl to understand this container's current API privileges if they’re too low. Then, the idea is to sniff the traffic to identify another workload with higher rights.

This list of actions means that there are standard interactions that a hacker will have on our containers, and that will be translated into a common syscall in the kernel of the node. Remember, the container/ pod is a simple process that runs the node.

If we rely on a fantastic technology that I have already made [an episode about](https://www.youtube.com/watch?v=jM3vL2LLm5o), and I’m referring to [eBPF](/observability/kubernetes/how-to-observe-your-network-with-ebpf), we could quickly deploy eBPF probes to watch for specific syscalls on our node. With eBPF, we can easily detect a process trying to access specific folders, change privileges, run a new process in the container, and more.

That is why most security runtime agents rely on eBPF to detect suspicious activities. These agents are usually configurable but come with predefined rules.

Our cluster will always have a vulnerable workload even if we apply the proper security rules and limited privileges. That is why we need eBPF agents like Falco, Tetragon, Kubearmor, and more to detect suspicious activity in our cluster automatically.

## Introduction to Falco

Falco is the most popular runtime security agent in the cloud-native world. When we refer to Falco, we usually think about detecting suspicious kernel events. That’s true, but Falco is a rule-based agent triggered by events.

Falco can receive various sources of events, but it would be a kernel event in the most common use case. The event will be processed through a set of Falco rules to determine if it matches one of the rules for detecting suspicious activities.

If the event matches the rule, Falco will produce a log in the Falco agent with details such as the rule name, event details, and more fields. The output is structured through the rule defined in Falco.

When deploying Falco, we will default to having the eBPF probe to capture the kernel events. However, we can also install plugins that will add extra events, although there is currently a limited selection of K8s audit, Okta, and Cloud trail.

Falco also has a native integration with [Gvisor](https://gvisor.dev/), an exciting project from Google that limits the interaction of our container with the environment's user space. Both projects combine blocking with Gvisor and detection with Falco.

Of course, Falco provides an SDK that allows us to write our plugins. Remember that Falco is a rule engine, and when deploying it, the Falco library will deploy the eBPF probe to capture kernel events by default. Falco will run as a daemonset in our cluster to detect kernel events on each node.

What is excellent is that Falco will be deployed with predefined rules designed to detect:

- Suspicious usage of the Kubernetes API

- Processes spawned in your container

- Access to sensitive folders of the container such as /etc, /usr/bin, /usr/sbin

- The creation of symlinks

- And more

In the [Falco docs](https://falco.org/docs/reference/rules/default-rules/), you can find the predefined rules that are deployed with it, which will also be stored in the Falco container:

```
/etc/Falco/Falco_rules.yaml
```

Of course, we can create our own rules, even if the syntax is simple. Creating a rule in Falco will mean you know the exact security event you want to capture by defining the type of process and the kernel capability.

If you’re planning to create your custom rules, we should write them in:

```
etc/Falco/rules.d/<filename>.yaml
```

Custom rules are always loaded after the default rules, meaning we can update existing rules in our custom rules.

## An overview of the Falco rule engine

The Falco rule engine is straightforward, and the syntax does not introduce anything fancy. A Falco rule requires several settings:

```yaml
rule: a name for our rule
desc: a simple description
condition: >
  evt.type = execve and
  evt.dir = < and
  container.id != host and
  (proc.name = bash or
  proc.name = ksh)
output: >
  shell in a container
  (user=%user.name container_id=%container.id container_name=%container.name
  shell=%proc.name parent=%proc.pname cmdline=%proc.cmdline)
priority: WARNING
tags:
```

The most important parts are the conditions, a set of boolean rules, and the output, which will generate the output sent in the Falco logs.

When constructing our conditions, Falco offers several objects. Evt represents the actual event.

- Evt.type in (open, openat) filters kernel events related to file openings in our system

- Evt.type=execve targets process launches

- **Dir**: Indicates the direction of the event, with \< for entry and > for exit

Evt has many more properties, which are detailed in the [Falco documentation](https://falco.org/docs/reference/rules/supported-fields/).

Falco also provides additional objects:

- **proc**: Details of the process

- **thread**

- user

- group

- container

- **fs**: Filesystem

- **fs**: Filesystem

- **k8s**: Kubernetes metadata.

With these objects, we can create precise rules to capture specific events.

For conditions, Falco provides various operators that allow you to create complex rules:

- \=, !=, \<, >

- Contains

- Startwith

- In

- Exists

Falco also offers functions to format variables: tolower, toupper, and b64decode for decoding base64 values. You can reuse these objects/variables to structure your output, appending % to display their values.

A set of conditions is often reused across multiple rules when building rules. To facilitate this, Falco introduced macros and lists.

Lists create a set of values that we could use in several rules. For example:

```yaml
- list: my_programs
  items: [ls, cat, pwd]
- rule: my_programs_opened_file
  desc: track whenever a set of programs opens a file
  condition: proc.name in (my_programs) and (evt.type=open or evt.type=openat)
  output: a tracked program opened a file (user=%user.name command=%proc.cmdline file=%fd.name)
  priority: INFO
```

And for the conditions, it relies on macros:

```yaml
- macro: access_file
  condition: evt.type=open
- rule: program_accesses_file
  desc: track whenever a set of programs opens a file
  condition: (access_file) and proc.name in (cat, ls)
  output: a tracked program opened a file (user=%user.name command=%proc.cmdline file=%fd.name)
  priority: INFO
```

Last, a rule could be easily enabled or disabled in the rule definition:

```yaml
rule: test_rule
desc: test rule description
condition: evt.type = close
output: user=%user.name command=%proc.cmdline file=%fd.name
priority: INFO
enabled: false
```

You can add the overwrite property to replace or modify an existing rule, which defines whether you’re appending or replacing it. For example:

```text
/etc/falco/falco_rules.yaml
- list: my_programs
  items: [ls, cat, pwd]
- rule: my_programs_opened_file
  desc: track whenever a set of programs opens a file
  condition: proc.name in (my_programs) and (evt.type=open or evt.type=openat)
  output: a tracked program opened a file (user=%user.name command=%proc.cmdline file=%fd.name)
  priority: INFO
Copy
/etc/falco/falco_rules.local.yaml
- list: my_programs
  items: [cp]
  override:
    items: append
```

## Introduction to Falcosidekick

Falco will detect any suspicious events from the rule you have defined, and it will, by default, produce logs in text or JSON format. To take further action, you need to collect the logs from Falco, parse them, and then build the right workflow to react to the Falco event.

To simplify this journey, Falco has developed another project called [Falcosidekick](https://github.com/falcosecurity/falcosidekick).

When deployed through Helm, Falco is configured to send the event directly to Falcosidekick, producing events in stdout in JSON format on the Falco agents.

If you have a log agent running, you may have the Falco events ingested twice in your environment, so you need to filter the Falco pods from your log collection.

The purpose of Falcosidekick is to parse events and push them to a destination, thus providing various outputs. You can send your Falco events to:

- Any observability solutions such as [Dynatrace](http://dynatrace.com), [Datadog](http://datadog.com), and more,

- Chat applications such as Slack, MS Teams, and more

- Logs platforms like Elasticsearch, Quickwit, Sumologic, etc.

- Messaging system

- Storage like s3

- Email

- Email

- WebUI and Falcosidekick UI

A response engine with the latest product of the Falco community talon could trigger a workflow based on a Falco event and more. The [Falco GitHub repository](https://github.com/Falcosecurity/Falcosidekick/tree/master?tab=readme-ov-file#outputs) has a full list of outputs.

In the end, Falcosidekick is a replica set that exposes a service that exposes Prometheus metrics on port 2801 and the path /metrics.

Falcosidekick also provides a UI to visualize Falco events, but if you’re already sending your events to a destination like an observability backend, the Falcosidekick UI has limited value.

Each output requires a specific configuration, so check the documentation of the output of your choice. By default, all the configuration of our outputs would be stored in a Kubernetes secret.

## Enhancing observability with Falco

On the observability side, Falco provides all the data you need for comprehensive monitoring.

First, the metrics server can easily observe Falco's actual health. Run the following installation, including “metrics.enable true” to deploy the metric server:

```bash
helm install falco \
      --set driver.kind=modern_ebpf \
      --set tty=true \
      --set collectors.kubernetes.enabled=true \
      --set falco.json_output=true \
      --set metrics.enabled=true \
```

The metric server will expose many metrics on Falco's rule engine and the eBPF probes running to collect kernel events. All the metrics on the Falco agent would have the prefix Falcosecurity.

There are plenty of metrics that can be classified into different categories. For example, resource usage, rule engine metrics, metrics on the event, and the behavior of the Falco agent's buffer.

However, we can easily rely on the logs produced by the Falco agent to extend the observability of Falco events. The fantastic thing is that Falco attached MITRE techniques to the events. [MITRE](https://attack.mitre.org/) is an organization that formalizes attacks per category.

Using analytics based on this technique, you can easily classify your events according to security priority.

Falcosidekick is an exciting project, but I don't think it is mandatory because the raw data is already in the logs produced by Falco. You would have to process the logs more to extract the relevant data on the Falco events. So it’s really up to you. The easy solution would be to use Falcosidekick to remove this complexity.

Furthermore, Falcosidekick provides an output of OpenTelemetry traces. So far, it has technically converted the Falco events into an OpenTelemetry trace. I’m not convinced of the value of using traces instead of logs to do the event analysis, and for such a use case, security, I probably don’t want to sample any of the Falco events.

It would be much better to have OpenTelemetry log OpenTelemetry events that push the process event to a collector or another endpoint.

When dealing with Falco, I’ll either use Falcosidekick or collect the logs of the Falco agents to report suspicious activity in my environment. I’ll also scrape the metrics provided by Falco to report its health, CPU usage, memory used, threads, buffer, number of events detected, number of rules managed, etc.

In this particular use case, I’ll exclude the traces and mainly focus on logs and metrics to report the security and health of my agents.
