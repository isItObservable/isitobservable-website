---
craftId: 35351
title: How to generate traces with your SQL database with the SQLCommenter
subline: The SQLcommenter is a new framework developed by Google to allow you to observe how your SQL database behaves. This blog post will explain how to observe SQL databases, what tools exist to do that, and how to use the SQLcommenter.
date: 2022-01-21T14:07:00Z
author: giulia-di-pietro
topics:
  - opentelemetry
  - sqlcommenter
  - observability
  - traces
image:
  src: ~/assets/images/sqlcommenter_part1_2025-03-13-131838_jvms.png
  title: How to generate traces with your SQL database? (SQL Commenter Part1 with Jan Kleinert from Google)
  alt: null
youtube: https://www.youtube.com/watch?v=REZUQsUL030
related:
  - open-telemetry/traces/a-short-guide-to-opentelemetry
goDeeper:
  - text: View the SQL Commenter tutorial on GitHub
    url: https://github.com/isItObservable/Episode-9----SqlCommenter
seo:
  description: This blog post will introduce you to the SQLcommenter, explain how to observe SQL databases, what tools exist to do that, and how to use the SQLcommenter.
jsonLd:
  - "@context": https://schema.org
    "@type": FAQPage
    mainEntity:
      - "@type": Question
        name: What is SQLCommenter?
        acceptedAnswer:
          "@type": Answer
          text: SQLCommenter is a library that helps developers correlate application code with SQL queries by injecting contextual information as comments into SQL statements.
      - "@type": Question
        name: How does SQLCommenter integrate with OpenTelemetry?
        acceptedAnswer:
          "@type": Answer
          text: SQLCommenter integrates with OpenTelemetry by propagating trace context into SQL queries, allowing for end-to-end observability across services and databases.
      - "@type": Question
        name: Which databases are supported by SQLCommenter?
        acceptedAnswer:
          "@type": Answer
          text: SQLCommenter supports several popular databases, including PostgreSQL, MySQL, and SQLite, depending on the language-specific implementation.
      - "@type": Question
        name: What programming languages are supported?
        acceptedAnswer:
          "@type": Answer
          text: SQLCommenter has implementations for multiple languages, including Python, Java, Node.js, and Ruby, each with its own integration method.
      - "@type": Question
        name: How do I enable SQLCommenter in my application?
        acceptedAnswer:
          "@type": Answer
          text: To enable SQLCommenter, install the appropriate library for your language, configure it to work with your database client, and ensure OpenTelemetry tracing is set up in your application.
      - "@type": Question
        name: How do you observe SQL databases?
        acceptedAnswer:
          "@type": Answer
          text: There are various tools you can use to observe your database; the most popular ones are DB Marlin, mySuperMon, D.SIDE software, Oracle Database, Microsoft SQL Server, and SolarWinds Database Performance Analyzer
      - "@type": Question
        name: How to detect issues in your database?
        acceptedAnswer:
          "@type": Answer
          text: In observability, we're used to taking advantage of traces to understand where we spend time in our architecture. But when it comes to databases and tracing, at the moment, we only know that we're spending 100ms (for example) in the database. But we don’t know if that time was spent mostly in the network, collecting the queries, doing full scans, etc. We don’t have these details. Because of this lack of details, we rely on our dba by requesting it to look at what could cause this latency.
      - "@type": Question
        name: What is the value of the sqlcommenter?
        acceptedAnswer:
          "@type": Answer
          text: The sqlcommenter is most valuable when combined with the Google Cloud SQL. Google Cloud SQL will automatically add more details to the execution of the query. You can then see the index, the full scan, the execution plan, and more.
---

Many enterprise applications today rely on SQL databases: [MySQL](https://www.mysql.com/), [PostgreSQL](https://www.postgresql.org/), [MariaDB](https://mariadb.org/), [MS SQL](https://www.microsoft.com/en-us/sql-server/sql-server-2019), and Oracle. If you look at solutions that are heavily used in our financial services, insurance companies, banking, and more, for example.

Most of these solutions allow us to fully customize the application by defining what we want to display on the page, the workflow related to creating and validating an asset, and more. Usually, all these customizations are stored in the SQL database of the product.

Consequently, the database achieves many goals: retrieving data, driving data visualization, executing the right workflow, etc.

Most performance engineers will confirm this, but those platforms used to have the same disease: the database. The database was the number one source of issues in those critical applications.

So the big question is, how can we properly observe our SQL databases to discover and fix those issues?

## How do you observe SQL databases?

There are various tools you can use to observe your database; here are some of the most popular ones:

### DB Marlin

It supports various SQL databases, from MySQL to Oracle, and it can provide you with a lot of information about what’s going on in your database. You can download it and get more information here.

### mySuperMon

MySuperMon is very similar to DB Marlin, but it also supports MongoDB. It has a very cool feature related to testing. If you were to exclude any type of tests, you could start recording on mySuperMon and it will give you statistics and insights about what’s happening in your tests. So that you can understand why your test has failed, for example.

Download it and get more information here.

### D.SIDE software

D.SIDE software is highly specialized for Oracle. It tells you what is happening in your Oracle database and has a cool replay feature for events in the database. The replay will help you understand the problem's consequence or root cause. Download it and get more information here.

### Oracle Database

Oracle developed Oracle Database specifically for their database.

You can get more information about it here.

### Microsoft SQL Server

Microsoft also developed their awesome tool to get more details on what’s happening in a MySQL database. You can get more information about it here.

### SolarWinds Database Performance Analyzer

This is a great tool for cross-platform database performance analysis and optimization. Get more information here.

In reality, all of those solutions on the market are collecting metrics using the internal technical database to retrieve metrics. Within your database, there are either technical administration tables or technical views. In those views, you can retrieve:

- The number of queries

- The number of connections

- The number of bytes

- The number of full scan

- Number of reads

- Number of writes

- ... etc

Those are interesting KPIs, but if our response time increases, it would be difficult to understand what is causing this on our database. This is what we usually call BlackBox monitoring.

Every SQL database engine has technical views that provide statistics and events related to the databases. Most of the market's solutions rely on available monitoring statistics, which means they're technically querying the database statistics table.

I.e., retrieving metrics from a PostgreSQL database can be done in two ways:

1. **Collect OS metrics on the PostgreSQL process running in that environment.**

   We can collect statistics like CPU, network, disk activity, memory, byte exchange, and connections.

2. **Collect statistics on the database side.**

   This usually adds overhead to the SQL engine. If you want to collect statistics, look at the documentation of your database. You'll probably need to enable it in the configuration of your database.

In the case of PostgreSQL, there are several components to be enabled in the configuration:

- **Track\_activites** to monitor the command executed

- **Track\_counts** to collect stats about table, index access

- **Track\_functions** to keep track on the usage of user-defined functions

- **Track\_io\_timing** to monitor block reads/write times

- **Track\_val\_io\_timing** to monitor WAL write times.

Once enabled, a process called “collector” will run and collect statistics and expose them in database views. It means that every x seconds, PostgreSQL collects data, aggregates it, and exposes the statistics in technical views.

Most SQL engines proceed with the same process. **We don’t usually get live insights but aggregated live insights into those statistics.** It’s made to reduce the overhead of collecting statistics on the database engine as much as possible.

Once you have enabled those modules, those views will be populated, and you can run some queries for some statistics.

For example, if we want to report the cache hit ratio on the PostgreSQL database, I can do it by running the command relative to that view. Here’s an example of the query for the cache hit ratio:

```sql
SELECT
  datname, 100 * blks_hit / (blks_hit + blks_read) as cache_hit_ratio
FROM
  pg_stat_database
WHERE (
  blks_hit + blks_read) > 0
```

If I want to retrieve the commit ratio, I’d instead run the following query:

```sql
SELECT
  datname, 100 * xact_commit / (xact_commit + xact_rollback) as commit_ratio
FROM
  pg_stat_database
WHERE
  (xact_commit + xact_rollback) > 0;
```

Both are running the query against the same view: pg\_stat\_database.

### Prometheus exporters

Most of the database engines on the market have the Prometheus exporter.

PostgreSQL, for example, has the [postgres\_exporter](https://github.com/prometheus-community/postgres_exporter) that allows you to collect metrics from your database by running some queries against the technical view. You can use the default queries to collect the default metrics, but you can also add your queries to extend or add more metrics to the exporter.

Another interesting Prometheus exporter provided by Percona is the [pg\_stat\_monitor](https://github.com/percona/pg_stat_monitor). It collects statistics related to the database. It provides the important queries that have been running on your system.

If you combine both exporters, you'll have more general statistics on your engine on one side, and on the other, you'll get the most heavily used queries running on your SQL database.

## Detecting issues in your database

Usually, when we think that an issue is in our database, we use our dba to look at it to detect issues in our index, like missing index, missing table statistics, etc.

We would usually take the query that seems to cause the problem, rerun it, get the execution plan that gives you insights and decide based on that.

That is why the dba usually uses specialized tooling to understand what is slowing down a given query or the most important queries generated by our applications. Usually, dbas are using solutions that won't only show health metrics but also events, queries, execution plans, etc.

If we have to troubleshoot an issue, we're currently not efficient enough. We detect the problem and then see the dba to get more insights. We have to wait until we get more information to be able to analyze.

In observability, we're used to taking advantage of traces to understand where we spend time in our architecture. But when it comes to databases and tracing, at the moment, we only know that we're spending 100ms (for example) in the database. But we don’t know if that time was spent mostly in the network, collecting the queries, doing full scans, etc. We don’t have these details.

Because of this lack of details, we rely on our dba by requesting it to look at what could cause this latency.

Including the details of what is currently happening in our database in our traces would be wonderful.

Well, thankfully, there is a new technology that will help us achieve this goal: the sqlcommenter.

## Introduction to the sqlcommenter

The [sqlcommenter](https://google.github.io/sqlcommenter/) is a suite of plugins that will add context to your SQL queries.

The context is technically added with the help of comments containing information about the code requested for executing a given technology.

The augmented SQL adds key-value pairs as SQL comments on our queries.

For example. I want to insert questions into a table called “polls\_question”. Here’s the SQL statement I would send to our database:

```
INSERT INTO "polls_question"
("question_text", "pub_date") VALUES
('What is this?', '2019-05-28T18:54:50.767481+00:00'::timestamptz) RETURNING
"polls_question"."id"
```

The wrapper will add extra information to our query :

```
INSERT INTO "polls_question"
("question_text", "pub_date") VALUES
('What is this?', '2019-05-28T18:54:50.767481+00:00'::timestamptz) RETURNING
"polls_question"."id" /*controller='index',db_driver='django.db.backends.PostgreSQL',
framework='django%3A2.2.1',route='%5Epolls/%24',
traceparent='00-5bd66ef5095369c7b0d1f8f4bd33716a-c532cb4098ac3dd2-01',
tracestate='congo%3Dt61rcWkgMzE%2Crojo%3D00f067aa0ba902b7'*/
```

The plugin attached to your preferred coding language will add several fields like :

- Controller

- Db\_driver

- Framework

- Route

- Traceparent: the w3C trace context transparent

- Tracestate: the w3c tracecontext tracestate

The sqlcommenter currently supports the following SQL engines:

- MySQL

- MariaDB

- SQLite

- PostgreSQL

- Google cloud SQL

By default, sqlcommenter will generate logs with the augmented SQL context in our database engine. If you use any agent log collector/forwarder, you'll be able to collect the generated log and attach it to any application.

### What is the value of the sqlcommenter?

The sqlcommenter is most valuable when combined with the Google Cloud SQL.

Google Cloud SQL will automatically add more details to the execution of the query. You can then see the index, the full scan, the execution plan, and more.

The other advantage is that Google Cloud SQL generates Google Cloud traces of the various steps managed by the database, end2end, from the user to the database. That’s exactly the level of detail that we're looking for.

### What does the sqlcommenter support?

Unfortunately, we don't have this for the vanilla PostgreSQL yet, but it is probably just a matter before Google starts supporting it.

If the main contributors of the various SQL databases are implementing those changes by adding those new libraries, it will mean that we will be able to generate OpenTelemetry traces, including SQL actions in any SQL database.

Here is the list of the languages and frameworks supported by sqlcommenter:

- **Python**

  Django

  Psycopg2

  sqlAlchemy

  Flask

- **Java**

  Hibernate

  spring

- **Nodejs**

  Knex

  Seuquelize.js

  Express

- **Ruby**

  rails

## Get started with sqlcommenter

As for most of my videos and blog posts, this one is also accompanied by a tutorial!

If you’d like to get your hands dirty, join me and follow my tutorial on YouTube and GitHub:

- YouTube: [How to generate traces with your SQL database? (SQL Commenter Part2 -Tutorial)](https://www.youtube.com/watch?v=XLbgjASVpTw)

- GitHub: [The sqlcommenter - how to get started](https://github.com/isItObservable/Episode-9----SqlCommenter)

If you want to learn more about sqlcommenter directly from the source, watch [the second part of my video](https://www.youtube.com/watch?v=REZUQsUL030&t=1261s) where I interview Jan Kleinert from Google. Or read the follow-up article, which summarizes what we talked about.
