#!/bin/bash

# SQLcl Connection Pool Performance Test
# Usage: ./SQLclPoolTest.sh [number_of_queries]

NUM_QUERIES=${1:-5}

echo "🧪 SQLcl Connection Pool Performance Test"
echo "=========================================="
echo "Testing $NUM_QUERIES sequential queries..."
echo ""

# Record start time
START_TIME=$(date +%s.%N)

# Execute multiple queries to test pool performance
for i in $(seq 1 $NUM_QUERIES); do
    echo "Query $i of $NUM_QUERIES..."
    
    # Time this individual query
    QUERY_START=$(date +%s.%N)
    
    # Execute a test query using the pool manager
    ./SQLclPoolManager.sh query "SELECT 'Query $i executed at ' || TO_CHAR(SYSDATE, 'HH24:MI:SS.FF3') || ' - Connection reused: Yes' as result FROM DUAL" > /dev/null
    
    QUERY_END=$(date +%s.%N)
    QUERY_TIME=$(echo "$QUERY_END - $QUERY_START" | bc)
    
    echo "  ⏱️  Query $i took: ${QUERY_TIME}s"
    
    # Small delay to simulate real usage
    sleep 0.1
done

# Record end time
END_TIME=$(date +%s.%N)

# Calculate total time
TOTAL_TIME=$(echo "$END_TIME - $START_TIME" | bc)
AVG_TIME=$(echo "scale=3; $TOTAL_TIME / $NUM_QUERIES" | bc)

echo ""
echo "📊 Performance Results:"
echo "======================="
echo "Total queries: $NUM_QUERIES"
echo "Total time: ${TOTAL_TIME}s"
echo "Average time per query: ${AVG_TIME}s"
echo "Queries per second: $(echo "scale=2; $NUM_QUERIES / $TOTAL_TIME" | bc)"

# Test pool status
echo ""
echo "🔍 Current Pool Status:"
echo "======================="
./SQLclPoolManager.sh status

echo ""
echo "✅ Performance test completed"
echo ""
echo "Expected improvements with connection pooling:"
echo "• First query: ~300-500ms (establishes pool)"
echo "• Subsequent queries: ~50-100ms (reuses connections)"
echo "• Overall: 70-85% performance improvement"
