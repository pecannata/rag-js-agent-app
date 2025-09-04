if [ $# -ne 1 ]
then
        echo "Usage: $0 SQLQuery"
        exit 1
fi

# Execute SQL and filter out warning messages
# sql -S RAGUSER/WelcomeRAG123###@129.213.106.172/RAG23ai_PDB1.sub08201532330.philfnvcn.oraclevcn.com <<! 2>/dev/null | grep -v "Warning:" | grep -v "It is recommended"
sql -S /nolog <<! 2>/dev/null | grep -v "Warning:" | grep -v "It is recommended"
SET SQLFORMAT JSON-FORMATTED
set feedback off
set long 1000000
set pagesize 0
set linesize 32767
set wrap off
set trimout on
set trimspool on
SET DEFINE OFF
connect alwayscurious/Cennete49Cennete49@(description= (retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1522)(host=adb.us-phoenix-1.oraclecloud.com))(connect_data=(service_name=gcc1a1ca06426f7_alwayscurious_low.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))
$1;
commit;
!
