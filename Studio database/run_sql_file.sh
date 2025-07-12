#!/bin/bash

# Simple script to execute SQL files using SQLcl
# Usage: ./run_sql_file.sh filename.sql

if [ $# -ne 1 ]; then
    echo "Usage: $0 filename.sql"
    exit 1
fi

SQL_FILE="$1"

if [ ! -f "$SQL_FILE" ]; then
    echo "Error: SQL file '$SQL_FILE' not found!"
    exit 1
fi

echo "Executing SQL file: $SQL_FILE"
echo "Using Oracle SQLcl connection..."

# Use the same connection as SQLclScript.sh
sql -S RAGUSER/WelcomeRAG123###@129.213.106.172/RAG23ai_PDB1.sub08201532330.philfnvcn.oraclevcn.com @"$SQL_FILE"

if [ $? -eq 0 ]; then
    echo "✓ SQL file executed successfully!"
else
    echo "✗ Error executing SQL file!"
    exit 1
fi
