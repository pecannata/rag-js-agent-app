insert into segs (id, seg, doc) values ('1', '--- Page 1 ---
Oracle DatabaseA complete and simple platform for all data management needs.Building an Environment of InnovationAdd a SQL statement, not a database! Oracle Database delivers best-of-breed support for all modern data types, workloads, and development styles. You can enhance productivity through the flexibility and simplicity of choosing the best data model and development framework for your application without worrying about integrating different database engines, managing multiple security models, or synchronizing data.Thanks to its commitment to continuous innovation and readiness, tens of thousands of businesses rely on the Oracle Database today. Whether youre a growing business or a globally recognized organization, the Oracle Database offers unparalleled availability, reliability, security, and scalability. In fact, 97% of the Fortune 100 companies use Oracle Database.Always Enterprise Ready
Elevate Your EfficiencyThe Oracle Database lets you focus on development', '23ai-one-pager');

select id, doc, vec, seg from segs where doc = '23ai-one-pager' order by 1;
select id, doc, vec, seg from segs where doc = 'enterprise_manager_overview_-_dd' order by 1;
select id, doc, vec, seg from segs where doc = 'Oracle RAG and Agentic AI Development Value Triangle'  order by 1;
select id, doc, vec, seg from segs where doc = 'Introducing OCI Database with PostgreSQL (Cloud World) (Customer Presentation)' order by 1;
select id, doc, vec, seg from segs where doc = 'OCI PostgreSQL Customer Deck (Customer Presentation)'  order by 1;

delete from segs where doc = '23ai-one-pager';

update segs set vec = (SELECT VECTOR_EMBEDDING(ALL_MINILM_L12_V2 USING seg as data) 
FROM segs where id = 1 and doc = '23ai-one-pager') where id = 1 and doc = '23ai-one-pager';

update segs set vec = (SELECT VECTOR_EMBEDDING(ALL_MINILM_L12_V2 USING seg as data) 
FROM segs where id = 4 and doc = '23ai-one-pager') where id = 4 and doc = '23ai-one-pager';

SELECT seg FROM segs WHERE doc = 'Introducing OCI Database with PostgreSQL (Cloud World) (Customer Presentation)' 
ORDER BY vector_distance(vec, 
(SELECT vector_embedding(ALL_MINILM_L12_V2 using 'Open Source Commitment' as data)), COSINE) 
FETCH FIRST 2 ROWS ONLY;

select unique(series), doc, count(*) as vectors from segs group by series, doc;

ALTER TABLE segs ADD series varchar2(4000);

update segs set series = 'ADB Competitve Analysis' 
where doc = 'Introducing OCI Database with PostgreSQL (Cloud World) (Customer Presentation)';
commit;

SELECT seg FROM segs WHERE doc = 'Introducing OCI Database with PostgreSQL (Cloud World) (Customer Presentation)' 
ORDER BY vector_distance(vec, 
(SELECT vector_embedding(ALL_MINILM_L12_V2 using 'OCIs unique features' as data)), COSINE) 
FETCH FIRST 2 ROWS ONLY;

SELECT seg FROM segs WHERE doc = 'Spiritual Informationals Book' 
ORDER BY vector_distance(vec, 
(SELECT vector_embedding(ALL_MINILM_L12_V2 using 'What miracles are mentioned' as data)), COSINE) 
FETCH FIRST 5 ROWS ONLY;

SELECT seg FROM segs WHERE series = 'ADB Competitve Analysis' ORDER BY 
vector_distance(vec, (SELECT vector_embedding(ALL_MINILM_L12_V2 using 
'Does Oracle have a competitive advantage with respect to scalability for PostgreSQL with Azure, Google, Microsoft. How does it compare to Oracle Autonomous Database. Give as many details as possible with making things up.' as data)), COSINE) 
FETCH FIRST 6 ROWS ONLY;