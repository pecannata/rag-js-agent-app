#!/bin/bash

# SQLcl Performance Comparison Script
# Tests the performance difference between old and new SQLclScript.sh

NUM_QUERIES=${1:-5}

echo "📊 SQLcl Performance Comparison"
echo "==============================="
echo "Testing $NUM_QUERIES queries with each method"
echo ""

# Create a backup of the original script for testing
cp SQLclScript.sh SQLclScript_Enhanced.sh

# Create a simple version without optimizations for comparison
cat > SQLclScript_Simple.sh << 'EOF'
#!/bin/bash
if [ $# -ne 1 ]; then
    echo "Usage: $0 SQLQuery"
    exit 1
fi

sql -S RAGUSER/WelcomeRAG123###@129.213.106.172/RAG23ai_PDB1.sub08201532330.philfnvcn.oraclevcn.com <<EOF
SET SQLFORMAT JSON-FORMATTED
set feedback off
set long 10000000
set pagesize 0
set linesize 32767
set wrap off
set trimout on
set trimspool on
$1;
EOF
EOF

chmod +x SQLclScript_Simple.sh

# Test simple version
echo "🔍 Testing Simple SQLcl (no optimizations)..."
START_TIME=$(date +%s.%N)

for i in $(seq 1 $NUM_QUERIES); do
    echo "  Query $i/$NUM_QUERIES (Simple)"
    ./SQLclScript_Simple.sh "SELECT 'Simple test $i at ' || TO_CHAR(SYSDATE, 'HH24:MI:SS') FROM DUAL" > /dev/null 2>&1
done

END_TIME=$(date +%s.%N)
SIMPLE_TIME=$(echo "$END_TIME - $START_TIME" | bc)

echo "  Simple version total time: ${SIMPLE_TIME}s"
echo "  Simple version avg per query: $(echo "scale=3; $SIMPLE_TIME / $NUM_QUERIES" | bc)s"
echo ""

# Test enhanced version
echo "🚀 Testing Enhanced SQLcl (with optimizations)..."
START_TIME=$(date +%s.%N)

for i in $(seq 1 $NUM_QUERIES); do
    echo "  Query $i/$NUM_QUERIES (Enhanced)"
    ./SQLclScript_Enhanced.sh "SELECT 'Enhanced test $i at ' || TO_CHAR(SYSDATE, 'HH24:MI:SS') FROM DUAL" > /dev/null 2>&1
done

END_TIME=$(date +%s.%N)
ENHANCED_TIME=$(echo "$END_TIME - $START_TIME" | bc)

echo "  Enhanced version total time: ${ENHANCED_TIME}s"
echo "  Enhanced version avg per query: $(echo "scale=3; $ENHANCED_TIME / $NUM_QUERIES" | bc)s"
echo ""

# Calculate improvement
IMPROVEMENT=$(echo "scale=2; (($SIMPLE_TIME - $ENHANCED_TIME) / $SIMPLE_TIME) * 100" | bc)

echo "📈 Performance Results:"
echo "======================"
echo "Simple version:   ${SIMPLE_TIME}s total"
echo "Enhanced version: ${ENHANCED_TIME}s total"
echo "Improvement:      ${IMPROVEMENT}% faster"
echo ""

if (( $(echo "$IMPROVEMENT > 0" | bc -l) )); then
    echo "✅ Enhanced version is ${IMPROVEMENT}% faster!"
else
    echo "⚠️  Enhanced version is $(echo "scale=2; $IMPROVEMENT * -1" | bc)% slower"
fi

echo ""
echo "💡 Key Improvements in Enhanced Version:"
echo "• Connection timeout optimization"
echo "• Socket keep-alive enabled"
echo "• Optimized session settings"
echo "• Better connection reuse"
echo "• Reduced overhead per query"

# Cleanup
rm -f SQLclScript_Simple.sh SQLclScript_Enhanced.sh

echo ""
echo "✅ Performance comparison completed"
