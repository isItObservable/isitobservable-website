---
craftId: 209741
title: How to observe your network with eBPF
subline: eBPF is a powerful technology that allows you to observe, secure, and filter your networks.
date: 2022-10-14T23:30:00Z
author: giulia-di-pietro
topics:
  - observability
  - ebpf
  - kubernetes
  - opentelemetry
image:
  src: ~/assets/images/ebpf.png
  title: What is ebpf?
  alt: null
youtube: https://www.youtube.com/watch?v=jM3vL2LLm5o
related:
  - observability/kubernetes/collect-metrics-in-kubernetes-cluster
  - observability/kubernetes/how-to-collect-logs-with-fluentd
  - observability/kubernetes/what-is-the-fluent-operator-and-how-do-you-use-it
  - observability/kubernetes/how-to-configure-fluent-bit-to-collect-logs-for-your-k8s-cluster
  - observability/kubernetes/how-to-collect-kubernetes-events
  - open-telemetry/what-is-the-opentelemetry-operator
goDeeper:
  - text: View the repository about eBPF on GitHub
    url: https://github.com/isItObservable/ebpf-kepler
seo:
  description: This blog post will introduce eBPF and its value. It will look at a BPF map and how to build an eBPF program and list a few solutions that use this technology!
jsonLd:
  - "@context": https://schema.org
    "@type": FAQPage
    mainEntity:
      - "@type": Question
        name: What is eBPF?
        acceptedAnswer:
          "@type": Answer
          text: eBPF stands for Extended Berkeley Packet Filter. It is a powerful technology that allows you to observe, secure, and filter your networks by running sandboxed programs in the Linux kernel without changing kernel source code or loading kernel modules.
      - "@type": Question
        name: How does eBPF work?
        acceptedAnswer:
          "@type": Answer
          text: eBPF works by attaching programs to various hooks in the kernel, such as system calls or network events. These programs can then collect data, perform actions, or modify behavior based on the events they observe.
      - "@type": Question
        name: What are BPF maps?
        acceptedAnswer:
          "@type": Answer
          text: BPF maps are data structures used by eBPF programs to store and share data. They can be used to maintain state across multiple events, such as counting the number of packets or tracking connections.
      - "@type": Question
        name: What are some common use cases for eBPF?
        acceptedAnswer:
          "@type": Answer
          text: Common use cases for eBPF include network performance monitoring, security enforcement, traffic filtering, and observability. eBPF can be used to create tools like tcpdump, which captures network packets, or to enforce security policies by filtering network traffic.
      - "@type": Question
        name: How can I get started with eBPF
        acceptedAnswer:
          "@type": Answer
          text: To get started with eBPF, you can follow tutorials and examples that demonstrate how to write and deploy eBPF programs. The blog post provides a hands-on tutorial to help you learn more about eBPF and its applications.
      - "@type": Question
        name: What’s the value of eBPF?
        acceptedAnswer:
          "@type": Answer
          text: With the extended version of BPF, you can improve the current features of the kernel by adding a process that collects KPIs when your kernel is managing a socket connection or other processes. The eBPF program can register to any kernel event, and once the kernel event happens, the eBPF program is triggered.
      - "@type": Question
        name: What type of kernel events exist?
        acceptedAnswer:
          "@type": Answer
          text: There are multiple types of events related to almost all the syscalls. Events can be related to the network (open a socket, close a socket, disk, write, read) or the creation of a process, a thread, a CPU instruction, etc.
      - "@type": Question
        name: How to create an eBPF program?
        acceptedAnswer:
          "@type": Answer
          text: Writing eBPF sounds very complicated, and it is. However, a way to simplify this process is by using the BCC framework. BCC stands for BPF Compiler Collection and helps you build a Python program. It was mainly built for profiling and tracing.
---

[eBPF](https://ebpf.io/) is a powerful technology that allows you to observe, secure, and filter your networks. In today’s blog post and related YouTube video, I'll introduce eBPF and its value. Then we will look at a BPF map and build an eBPF program before we look at a few solutions that use this technology. As usual, we will finish with a tutorial so you can learn more about eBPF hands-on.

## What is eBPF?

eBPF stands for Berkley Packet Filter and is the new version of the [BPF](https://de.wikipedia.org/wiki/Berkeley_Packet_Filter) technology.

BPF was initially created in 1992 to analyze the network traffic and provide filtering capabilities. At that time, network traffic was much simpler than today, but many engineers were already thinking about analyzing and filtering traffic.

Let’s say we want to analyze and report all the TCP communication managed by our server.

To do this, we can modify all our servers' code to log everything from our incoming or outgoing connection. This approach could work but will require a lot of effort, And we would need to provide this code to all the organization’s servers. The other solution is to fork the kernel version of our server and update the kernel by adding instrumentation instructions in our kernel. This approach is more complex. Building kernel code is very complex, and we would need to run lots of tests to measure the impact of this code fully. Moreover, how will I manage all the security patches in the future?

The kernel code provides many features but manages all the instructions to interact with our hardware. When we build our code, we never define how to interact with a hardware device like a disk. Our code uses a predefined syscall to interact with the hardware: network card, disk, etc. When we deploy our code on our system, it will sit in the user space. Our code will interact with the kernel, which will be a bridge to our hardware.

For example, in my car, I have a screen to adjust the air conditioning. A certain software manages this screen that interacts with the hardware components in the car. But the coder didn’t instruct the software to send signals directly to the air conditioner. Instead, it sends a syscall to the car’s kernel that will send the right signal to the air conditioner.

BPF was created to be able to inject simple programs in your kernel based on syscall events.

Once the BPF code is deployed, it will register to a network packet kernel event. For example, we can program it to look at incoming and outgoing packets. Every time a packet comes into the server, the BPF program is launched and analyzes the TCP packet.

Several networking tools have been built with the help of BPF, like [tcpdump](https://www.tcpdump.org/).

BPF was also used for filtering. Let’s say we want to accept packets with a signed hash in the packet's header. Similar to the analysis scenario, the BPF program will be launched and look at the header; if the expected value or field is missing, it drops the packet.

As you can understand BPF was mainly focused on networking use cases.

Since kernel 3.18, an extended version of BPF has been released, providing more features:

- It won't only focus on packet filtering events but almost all kernel events

- It provides support for 64bits to collect and store more information

- A new data structure to help us to store data and exchange it with our user space programs

## What’s the value of eBPF?

With the extended version of BPF, you can improve the current features of the kernel by adding a process that collects KPIs when your kernel is managing a socket connection or other processes.

The eBPF program can register to any kernel event, and once the kernel event happens, the eBPF program is triggered.

What type of kernel events exist?

There are multiple types of events related to almost all the syscalls. Events can be related to the network (open a socket, close a socket, disk, write, read) or the creation of a process, a thread, a CPU instruction, etc.

With eBPF we can now build programs for various use cases:

- Networking to analyze, route, and more

- Security to filter traffic based on specific rules and report any valid or blocked traffic

- Tracing/Profiling to collect detailed execution flows from the user space programs to kernel instructions

- Observability to report disk activity, process, CPU instruction, etc. It is more efficient because we're not pooling for information; our program is launched exactly when we need to measure something

Many engineers, including Thomas Graf from Isovalent/Cilium, compare eBPF to having JavaScript in your browser.

As you all know JavaScript can modify or change your page structure based on DOM events.

Well, eBPF would do the same but with your kernel.

So let’s say that we want to write a program that collects the number of bytes, the name of the file, and the folder when we write into a file.

![eBPF program](~/assets/images/ebpf1.jpg)

First, you need to identify the right syscall event. In this case, it would be vfs\_write. Afterward, you can start writing the eBPF code that will register to your vfs\_write event.

Once the code is deployed, every time a vfs\_write syscall is triggered, our eBPF program will be executed, and we will collect the right data.

The big question is, how can we retrieve the data in the traditional user space?

For this, eBPF comes with the BPF map that can help you store data into a hashmap, a stack trace, and more.

## Introduction to BPF maps

The BPF map is one of the major improvements provided by eBPF. The BPF map is storage located in the kernel. eBPF provides a syscall to retrieve the data stored in the BPF map.

![BPF map](~/assets/images/ebpf2.jpg)

eBPF provides various BPF maps, which you can check out in the [Linux Kernel docs](https://prototype-kernel.readthedocs.io/en/latest/bpf/ebpf_maps_types.html). All of them have been designed for specific use cases. Here are some examples:

- BPF\_MAP\_TYPE\_HASH and BPF\_MAP\_TYPE\_PERCPU\_HASH are hash map storage, so key-value pair storage but BPF\_MAP\_TYPE\_PERCPU\_HASH provides a separate value slot per CPU

- BPF\_MAP\_TYPE\_ARRAY will provide storage similar to an Array. Where we would define the maximum size of the array

- BPF\_MAP\_TYPE\_PERCPU\_ARRAY provides storage per CPU histograms of latency

- BPF\_MAP\_TYPE\_STACK\_TRACE can be used to store stack traces of your programs

Therefore when building your eBPF program, you'll need to figure out what type of BPF map you need to use (HASHMAP and ARRAY are heavily used).

To be able to use a BPF map you need first to declare it by defining:

- The BPF map type

- The max number of elements

- The key size in bytes

- The value size in bytes

The kernel comes with predefined functions allowing us from the user space to create a BPF map, look up a given key, create or update a key value in the map, find and delete by key, and delete a map

## How to create an eBPF program

Writing eBPF sounds very complicated, and it is. However, a way to simplify this process is by using the [BCC framework](https://github.com/iovisor/bcc). BCC stands for BPF Compiler Collection and helps you build a Python program. It was mainly built for profiling and tracing.

BCC provides a set of tools built by the community and initially used by [Brendan Gregg](https://www.brendangregg.com/).

There is a list of predefined Python that will help us to trace various components of the kernel as explained in this diagram.

![eBPF tracing tools](~/assets/images/ebpf3.jpg)

If you want to learn about those tools, I recommend watching [this video](https://youtu.be/FJW8nGV4jxY) by Brendan Greggs on Linux Performance Tools.

You define a Python/Go program that will declare a string containing our eBPF program in C language, explain what to do with our metrics collected in a BPF map, and register our eBPF program to a specific kernel event.

When you deploy your BCC program, it will go through several steps to be validated:

- First, it uses BCC to build the eBPF bytecode program

- The bytecode program goes through the eBPF verifier, ensuring that the program is safe and performant

- Then it goes into the JIT compiler that transforms the eBPF code into bytecodes

Otherwise, BPFtrace provides high-level tracing language from our kernel (vers 4.x+).

So, you build a BPFtrace program that will be compiled to generate the program in byte code then it will follow a similar journey, first the eBPF verifier and then the Jit compiler

There is also an eBPF Go library that follows a similar approach described by the BCC Python library.

The eBPF program should be lightweight and reliable, and it needs to use a set of helper functions built for BPF to access various kernel elements. The set of available helper calls is constantly evolving.

Finally, an eBPF program needs to have a type. The most common types are kprobe (collect kernel level details), uprobe (collect details from the user space), and tracepoints.

## Kepler eBPF tutorial

In today's tutorial, we are going to use [Kepler](https://sustainable-computing.io/) to illustrate an ebpf solution. Kepler is deployed as daemonset. The main pod of Kepler injects ebpf programs to collect performance counters and tracepoints. With the help of the data collected and a data model, it calculates the power consumption. It also requires a Cluster Role, to let Kepler convert container id information to Kubernetes pods and also collect group stats.

In this tutorial, we will deploy the Kepler and its default Grafana dashboard, but we will ingest the Kepler metrics in Dyanatrace and build a Dynatrace dashboard.

For this tutorial, we would need:

- A Kubernetes cluster

- A dynatrace Tenant

- Nginx ingress controller

- The OpenTelemetry operator

- The Prometheus Operator without any default exporters : node-exporter and kubestatemetrics

- The OpenTelemetry Operator

- The OpenTelemetry demo application

- Deploy Kepler

Watch the full tutorial on my YouTube Channel: [What is eBPF?](https://www.youtube.com/watch?v=jM3vL2LLm5o)

Or follow the instructions directly on GitHub: [isItObservable/ebpf-kepler (github.com)](https://github.com/isItObservable/ebpf-kepler)
