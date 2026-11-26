---
craftId: 83437
title: Helping users understand SQL databases with the sqlcommenter
headline: Helping users understand SQL databases with the sqlcommenter
subline: What I’ve learned about the history and future development of sqlcommenter by talking to Jan Kleinert, who is part of the team at Google that invented the standard.
date: 2022-02-01T12:58:00Z
author: giulia-di-pietro
topics:
  - opentelemetry
  - traces
  - sqlcommenter
  - observability
image:
  src: ~/assets/images/sqlcommenter_part1.png
  title: How to generate traces with your SQL database? (SQL Commenter Part1 with Jan Kleinert from Google)
  alt: null
youtube: https://www.youtube.com/watch?v=REZUQsUL030
related:
  - open-telemetry/traces/how-to-generate-traces-with-your-sql-database-with-the-sqlcommenter
goDeeper:
  - text: View the SQL Commenter tutorial on GitHub
    url: https://github.com/isItObservable/Episode-9----SqlCommenter
---

The sqlcommenter is changing the observability game on our databases. And during my [latest video on the sqlcommenter](https://www.youtube.com/watch?v=REZUQsUL030), I had the opportunity to talk to Jan Kleinert from Google and ask her, among other things, what the plans for the standard are.

If you don’t know what sqlcommenter is, check out [my previous blog post](/open-telemetry/traces/how-to-generate-traces-with-your-sql-database-with-the-sqlcommenter) where I introduce the topic and walk you through a full tutorial on sqlcommenter.

Jan Kleinert is a developer advocacy manager at Google, particularly in the Google Cloud team. Her team works with VMs and databases, so that’s why sqlcommenter came into her world. Here’s a summary of what we discussed during our interview.

**Henrik**: Sqlcommenter currently supports only some existing database engines (PostgreSQL, MySQL, MariaDB, SQLlite). Are there any plans to expand it to support other ones?

**Jan:** *Sqlcommenter is an open standard and also a library. As the team created it, they tested it against PostgreSQL, MariaDB, etc. But now that it’s out there and open source, we have been getting feedback from users that they would like to see support for more databases and frameworks.*

*It is possible to add support for other databases, and we're hoping we can get community contributions to do it. But no, we currently don’t have a specific timeline.*

**Henrik**: Currently, sqlcommenter is only able to generate traces when it is combined with Google Cloud’s SQL. Are there any plans to provide this tracing feature on vanilla versions of the database engines?

**Jan:** *Right now, CloudSQL is the only integrated database against that information. The sqlcommenter can insert the trace state and the trace parent into the comments. Then, that gets tied into the CloudSQL insights interface. So, when you go there and look at something, you can jump in and look into traces, query plans, and so on.*

*We’re not aware of ongoing work with other database providers, but we’d love to have that. If any other database engines would love to work on that, they can add an issue for a feature request, and I know that my team would be happy to support them to get that done.*

**Henrik**: Google gave the sqlcommenter to the OpenTelemetry community. Do you know if there's any roadmap, any plans for the future to add extra features to the framework?

**Jan:** *Now that this is part of OpenTelemetry, we hope to reach a broader audience and get more contributions and interest from the community. In the shorter term, we're looking towards expanding sqlcommenter support for more languages and RMs. Specifically PHP and Go.*

**Henrik**: SQL databases are very popular and heavily used by many solutions, but most recent projects have started utilizing NoSQL databases. Are there any plans to also add support for NoSQL databases?

**Jan:** *Unfortunately, we currently don’t have plans to do that. However, the existing sqlcommenter algorithm can be potentially extended or adapted to support NoSQL.*

**Henrik**: The sqlcommenter is changing the observability game on our databases.

For now, we mostly rely on metrics the database engines expose (through technical views). Is there a plan to also include some metrics with the SQL commenter?

**Jan:** *The sqlcommenter supports specific standard fields like the DB driver, OpenTelemetry trace parameters, framework… so, the action-controller route. You can also include any custom tags and values, like key-value pairs that you come up with.*

*For example, if you wanted to test two different versions of an app for performance issues, you could create a version tag and pass it through the sqlcommenter. Any arbitrary key-value pairs would work as long as whatever you’re using on the other side to decode that information is looking for a set of tags to get that information back.*

*For database metrics, I’m not sure if it would be easy to insert that from your application. The timing of when you’re inserting the comments might not be right. If you’ve got various metrics enabled in your database, it’s typically enabled in your logs. Potentially, there’s a way that you can view this information at the same time. But, I don’t know about a way right to insert the database metrics information into the sqlcommenter comments.*

**Henrik:** What is the story behind the sqlcommenter? Why did Google decide to work on such a framework and provide it to the committee?

**Jan:** *It’s something that the team involved in CloudSQL had been wanting for a long time: give users that might not be database experts the possibility to see what’s happening and see database performance. For full-stack developers, it’s really difficult to understand how the database performs while using an ORM. It’s difficult to know unless you’re deeply familiar with the application. Providing something that can make it easier for people without being super database experts was one of the goals behind the project. It’s exciting to see the project out there and donated to the community for it to be vendor neutral and expandable.*

**Henrik:** Does Google have a process for using the sqlcommenter to detect regression? In an observability backend, you can search for traces and then try to compare them.

**Jan:** *The way I’ve been doing it is fairly basic. I’m just using whatever queries I have available in the logging or tracing views. Once I see what the syntax is, I set up a regex or a query that’s looking for whichever tags I care about and just view the separate logs that way.*

*I haven’t done anything where I’m aggregating that to try to do any real analysis. It’s partly because I’m working with CloudSQL Insights, and that’s been doing some of that work for me. If you look at the interface, you can drill based on certain values or aggregated sets of information. If you have a specific set of tags aggregated in a certain way, you should be able to narrow down those entries in your logs and do some analysis. But it requires work from the person who is aggregating the logs.*

And that’s it! That’s all we had time to talk with Jan about the sqlcommenter.

I want to take this opportunity to thank her again for coming on to my channel and to thank Google at large for creating this extremely useful tool: the sqlcommenter.

Hopefully, we’ll get to see Jan again soon on another episode!
