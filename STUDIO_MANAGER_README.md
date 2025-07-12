# Studio Manager - Oracle Database Implementation

## Overview

The Studio Manager is a comprehensive dance studio management system that replaces Excel-based student tracking and scheduling. It provides a modern web interface backed by a robust Oracle database.

## Features

### 🎯 **Core Functionality**
- **Student Management**: Complete student database with parent/guardian information
- **Class Enrollment**: Track enrollment in multiple class types (Audition Prep, Technique Intensive, Ballet Intensive, Master Intensive)
- **Weekly Scheduling**: Visual calendar interface for lesson scheduling
- **Analytics Dashboard**: Real-time statistics and insights
- **Search & Filter**: Quick student lookup functionality
- **Data Export**: CSV export capability

### 🗃️ **Database Architecture**

#### Tables (All prefixed with `STUDIO_`)
1. **STUDIO_STUDENTS** - Core student information
2. **STUDIO_CLASS_TYPES** - Available class types
3. **STUDIO_STUDENT_CLASSES** - Student-class enrollment relationships
4. **STUDIO_WEEKLY_SCHEDULES** - Weekly schedule containers
5. **STUDIO_SCHEDULE_SLOTS** - Individual lesson time slots
6. **STUDIO_ATTENDANCE** - Attendance tracking

#### Views (For easy data access)
1. **STUDIO_STUDENTS_V** - Students with class enrollment flags and age groups
2. **STUDIO_WEEKLY_SCHEDULE_V** - Complete schedule with student details
3. **STUDIO_ANALYTICS_V** - Dashboard statistics
4. **STUDIO_STUDENT_ENROLLMENTS_V** - Detailed enrollment information
5. **STUDIO_ATTENDANCE_SUMMARY_V** - Attendance summaries and percentages
6. **STUDIO_SCHEDULE_CONFLICTS_V** - Conflict detection for scheduling

## Setup Instructions

### 1. Database Setup
```bash
# Run the setup script to create all database objects
./setup-studio-database.sh
```

This script will:
- Create all tables with proper relationships and constraints
- Set up views for easy data access
- Create triggers for automatic age calculation and timestamps
- Load sample data for testing

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Access Studio Manager
Navigate to your app and click on the **Studio Manager** tab (🩰 icon).

## API Endpoints

### Students API
- `GET /api/studio/students` - Get all students (with optional search)
- `POST /api/studio/students` - Create new student
- `PUT /api/studio/students/[id]` - Update existing student
- `DELETE /api/studio/students/[id]` - Delete student

### Schedule API
- `GET /api/studio/schedule?weekStart=YYYY-MM-DD` - Get weekly schedule
- `POST /api/studio/schedule` - Add new lesson slot

### Analytics API
- `GET /api/studio/analytics` - Get dashboard statistics

## Database Features

### Automatic Calculations
- **Age Calculation**: Automatically calculated from birth date using database triggers
- **Age Groups**: Students automatically categorized (Minis 4-7, Juniors 8-11, Teens 12-15, Seniors 16+)
- **Timestamps**: Created/modified dates automatically maintained

### Data Integrity
- **Foreign Key Constraints**: Maintain data consistency across tables
- **Unique Constraints**: Prevent duplicate enrollments
- **Check Constraints**: Validate data ranges and formats

### Performance Optimization
- **Indexes**: Strategic indexing on frequently searched columns
- **Views**: Pre-joined data for efficient queries
- **Efficient Queries**: Optimized SQL for analytics and reporting

## Excel File Compatibility

The Studio Manager replicates the functionality of two Excel files:

### 1. Pulse MASTER DATA FILE.xlsx
- **Students Sheet**: Core student information
- **Class Tracking**: Multiple sheets for different age groups and classes
- **Attendance**: Event-specific attendance tracking

### 2. Private lesson Calendar.xlsx
- **Weekly Schedules**: 52+ weekly sheets for the entire year
- **Time Slots**: Detailed scheduling grid with days and times
- **Lesson Types**: Different types of lessons and choreography sessions

## Advanced Features

### 1. Search & Filtering
- Full-text search across student names, emails, and parent names
- Real-time filtering as you type
- Case-insensitive search

### 2. Analytics Dashboard
- Total student count
- Class enrollment statistics
- Age group breakdowns
- Weekly lesson counts
- Real-time updates as data changes

### 3. Conflict Detection
- Automatic detection of scheduling conflicts
- View for identifying double-booked time slots
- Prevent data inconsistencies

### 4. Audit Trail
- Created/modified timestamps on all records
- User tracking for who made changes
- Complete history of data modifications

## Data Migration

### From Excel Files
1. Export Excel data to CSV format
2. Use the provided import utilities in `app/lib/excel-utils.ts`
3. Process data through the API endpoints
4. Validate imported data using the analytics dashboard

### Backup and Restore
```sql
-- Export all studio data
SELECT * FROM STUDIO_STUDENTS_V;
SELECT * FROM STUDIO_WEEKLY_SCHEDULE_V;

-- Full backup
expdp RAGUSER/WelcomeRAG123### schemas=RAGUSER include=TABLE:"LIKE 'STUDIO_%'"
```

## Security Considerations

### Authentication
- NextAuth integration for user authentication
- Session-based access control
- Protected API endpoints

### Data Protection
- Input validation on all forms
- SQL injection prevention through parameterized queries
- XSS protection through React's built-in sanitization

### Access Control
- User-specific data access
- Admin-only functions for sensitive operations
- Audit logging for data changes

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify SQLclScript.sh connectivity
   - Check Oracle database availability
   - Confirm user permissions

2. **API Endpoint Errors**
   - Check Next.js server logs
   - Verify database views exist
   - Confirm authentication status

3. **Frontend Display Issues**
   - Check browser console for JavaScript errors
   - Verify API responses in Network tab
   - Confirm data format matches interfaces

### Performance Optimization

1. **Database**
   - Ensure indexes are created on search columns
   - Monitor query performance using EXPLAIN PLAN
   - Consider partitioning for large datasets

2. **Frontend**
   - Implement pagination for large student lists
   - Use React.memo for expensive components
   - Optimize re-renders with proper dependency arrays

## Future Enhancements

### Planned Features
1. **Attendance Integration**: Direct attendance tracking from schedule
2. **Parent Portal**: Limited access for parents to view schedules
3. **Automated Notifications**: Email/SMS reminders for lessons
4. **Payment Integration**: Track payments and outstanding balances
5. **Mobile App**: React Native companion app
6. **Reporting**: Advanced reports and data export options

### Technical Improvements
1. **Real-time Updates**: WebSocket integration for live data
2. **Offline Support**: PWA capabilities for offline access
3. **Data Visualization**: Charts and graphs for analytics
4. **Bulk Operations**: Import/export large datasets
5. **API Documentation**: OpenAPI/Swagger documentation

## Support

For technical support or questions:
1. Check the troubleshooting section above
2. Review the database logs using SQLclScript.sh
3. Examine Next.js server logs in development mode
4. Use browser developer tools for frontend debugging

## Contributing

When making changes to the Studio Manager:
1. Update database schema in `database/studio_schema.sql`
2. Modify views in `database/studio_views.sql`
3. Update API endpoints in `app/api/studio/`
4. Modify frontend components in `app/components/StudioManager.tsx`
5. Run tests and verify all functionality
6. Update this documentation

---

**Built with:** Next.js, React, TypeScript, Oracle Database, TailwindCSS
**Database:** Oracle 23ai with STUDIO_ prefixed objects
**Authentication:** NextAuth.js
