if [ $# -ne 1 ]
then
        echo "Usage: $0 SQLQuery"
        exit 1
fi

# Execute SQL and filter out warning messages
sql -S RAGUSER/WelcomeRAG123###@129.213.106.172/RAG23ai_PDB1.sub08201532330.philfnvcn.oraclevcn.com <<! 2>/dev/null | grep -v "Warning:" | grep -v "It is recommended"
SET SQLFORMAT JSON-FORMATTED
set feedback off
set long 1000000
set pagesize 0
set linesize 32767
set wrap off
set trimout on
set trimspool on
SET DEFINE OFF
$1;
commit;
!
