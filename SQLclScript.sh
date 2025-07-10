
#!/bin/bash

if [ $# -ne 1 ]
then
	echo "Usage: $0 SQLQuery"
	exit 1
fi

# Create a temporary SQL file
TEMP_SQL=$(mktemp)

# Write the commands to the temporary file
cat > "$TEMP_SQL" << EOF
SET SQLFORMAT JSON-FORMATTED;
SET FEEDBACK OFF;
SET LONG 100000;
SET PAGESIZE 0;
SET LINESIZE 32000;
SET TRIMSPOOL ON;
SET TRIMOUT ON;
SET WRAP OFF;
$1;
COMMIT;
EXIT;
EOF

# Execute the SQL file
sql -S RAGUSER/WelcomeRAG123###@129.213.106.172/RAG23ai_PDB1.sub08201532330.philfnvcn.com @"$TEMP_SQL"

# Clean up
rm -f "$TEMP_SQL"
