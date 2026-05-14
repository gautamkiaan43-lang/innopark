@echo off
echo Importing schema into crm_db_innopark...
mysql -u root -p crm_db_innopark < schema.sql
echo.
echo Schema import complete!
pause
