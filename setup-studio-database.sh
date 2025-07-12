#!/bin/bash

# Studio Manager Database Setup Script
# This script creates all the necessary database objects for the Studio Manager

echo "🩰 Setting up Studio Manager Database..."
echo "========================================="

# Check if SQLclScript.sh exists
if [ ! -f "./SQLclScript.sh" ]; then
    echo "❌ Error: SQLclScript.sh not found in current directory"
    echo "Please make sure you're in the correct directory with SQLclScript.sh"
    exit 1
fi

# Make SQLclScript.sh executable
chmod +x ./SQLclScript.sh

echo "📋 Step 1: Creating database schema (tables, indexes, triggers)..."
./SQLclScript.sh "$(cat database/studio_schema.sql)"
if [ $? -eq 0 ]; then
    echo "✅ Schema created successfully"
else
    echo "❌ Error creating schema"
    exit 1
fi

echo ""
echo "👁️ Step 2: Creating database views..."
./SQLclScript.sh "$(cat database/studio_views.sql)"
if [ $? -eq 0 ]; then
    echo "✅ Views created successfully"
else
    echo "❌ Error creating views"
    exit 1
fi

echo ""
echo "📊 Step 3: Loading sample data..."
./SQLclScript.sh "$(cat database/studio_sample_data.sql)"
if [ $? -eq 0 ]; then
    echo "✅ Sample data loaded successfully"
else
    echo "❌ Error loading sample data"
    exit 1
fi

echo ""
echo "🔍 Step 4: Verifying setup..."

# Check tables
echo "Checking tables..."
TABLES=$(./SQLclScript.sh "SELECT COUNT(*) as table_count FROM user_tables WHERE table_name LIKE 'STUDIO_%'")
echo "Tables created: $TABLES"

# Check views
echo "Checking views..."
VIEWS=$(./SQLclScript.sh "SELECT COUNT(*) as view_count FROM user_views WHERE view_name LIKE 'STUDIO_%'")
echo "Views created: $VIEWS"

# Check sample data
echo "Checking sample data..."
STUDENTS=$(./SQLclScript.sh "SELECT COUNT(*) as student_count FROM STUDIO_STUDENTS")
echo "Sample students: $STUDENTS"

echo ""
echo "📈 Step 5: Testing analytics..."
./SQLclScript.sh "SELECT * FROM STUDIO_ANALYTICS_V"

echo ""
echo "🎉 Studio Manager Database Setup Complete!"
echo "========================================="
echo ""
echo "📋 Summary:"
echo "• 6 tables created with STUDIO_ prefix"
echo "• 6 views created for easy data access"
echo "• Sample data loaded (6 students, schedules, attendance)"
echo "• Triggers created for automatic age calculation and timestamps"
echo "• Analytics view ready for dashboard"
echo ""
echo "🚀 Next Steps:"
echo "1. Install dependencies: npm install"
echo "2. Start the development server: npm run dev"
echo "3. Navigate to the Studio Manager tab (🩰) in your app"
echo ""
echo "📊 Database Objects Created:"
echo "Tables:"
echo "  - STUDIO_STUDENTS (student information)"
echo "  - STUDIO_CLASS_TYPES (class definitions)"
echo "  - STUDIO_STUDENT_CLASSES (enrollment tracking)"
echo "  - STUDIO_WEEKLY_SCHEDULES (weekly schedule containers)"
echo "  - STUDIO_SCHEDULE_SLOTS (individual lesson slots)"
echo "  - STUDIO_ATTENDANCE (attendance tracking)"
echo ""
echo "Views:"
echo "  - STUDIO_STUDENTS_V (students with class enrollment flags)"
echo "  - STUDIO_WEEKLY_SCHEDULE_V (schedule with student details)"
echo "  - STUDIO_ANALYTICS_V (dashboard statistics)"
echo "  - STUDIO_STUDENT_ENROLLMENTS_V (enrollment details)"
echo "  - STUDIO_ATTENDANCE_SUMMARY_V (attendance summaries)"
echo "  - STUDIO_SCHEDULE_CONFLICTS_V (scheduling conflict detection)"
echo ""
