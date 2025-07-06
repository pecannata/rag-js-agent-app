
if [ $# -ne 1 ]
then
	echo "Usage: $0 SQLQuery"
	exit 1
fi

sql -S RAGUSER/WelcomeRAG123###@129.213.106.172/RAG23ai_PDB1.sub08201532330.philfnvcn.oraclevcn.com <<!
SET SQLFORMAT JSON-FORMATTED
set feedback off
$1;
commit;
!
