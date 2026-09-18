UPDATE registrations
SET review_status = 'pending'
WHERE review_status = 'reviewed';
