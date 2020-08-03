ALTER TABLE public.facility_master ADD status bool NULL DEFAULT true;
COMMENT ON COLUMN public.facility_master.status IS 'true=>Show,false=>Hide';


ALTER TABLE public.part_ledger ADD "receiveBy" varchar(250) NULL;
ALTER TABLE public.part_ledger ADD "receiveDate" int8 NULL;
ALTER TABLE public.part_ledger ADD "deductBy" varchar(250) NULL;
ALTER TABLE public.part_ledger ADD "deductDate" int8 NULL;
ALTER TABLE public.part_ledger ADD "building" int8 NULL;
ALTER TABLE public.part_ledger ADD "floor" int8 NULL;


ALTER TABLE public.entity_bookings ADD "confirmedType" int8 NULL;
COMMENT ON COLUMN public.entity_bookings."confirmedType" IS '1=>Auto Confirmed,0=>Manually';

CREATE TABLE public.facility_report_master (
	id bigserial NOT NULL,
	"reportName" varchar(250) NULL,
	"createdBy" int8 NULL,
	"createdType" int8 default 0,
	"reportJson" json NULL,
	"createdAt" int8 NULL,
	"updatedAt" int8 NULL,
	"orgId" int8 null default 0,
	CONSTRAINT facility_report_master_pkey PRIMARY KEY (id)
);

ALTER TABLE public.part_ledger ADD "issueBy" int8 NULL;
ALTER TABLE public.part_ledger ADD "issueTo" int8 NULL;
ALTER TABLE public.part_ledger ADD "issueDate" int8 NULL;
ALTER TABLE public.part_ledger ADD "storeAdjustmentBy" int8 NULL;
ALTER TABLE public.part_ledger ADD "returnedBy" int8 NULL;
ALTER TABLE public.assigned_parts ALTER COLUMN quantity TYPE float8 USING quantity::float8;

ALTER TABLE public.part_ledger ALTER COLUMN "issueBy" TYPE varchar USING "issueBy"::varchar;
ALTER TABLE public.part_ledger ALTER COLUMN "issueTo" TYPE varchar USING "issueTo"::varchar;


--- Db Mirgration After 17July 2020---

ALTER TABLE public.facility_master ADD COLUMN "enableCheckIn" boolean;
ALTER TABLE public.facility_master ALTER COLUMN "enableCheckIn" SET DEFAULT true;

ALTER TABLE public.facility_master ADD COLUMN "checkInType" bigint;

ALTER TABLE public.facility_master ADD COLUMN "preCheckinTime" character varying;


ALTER TABLE public.task_assigned_part ADD "status" int8 NULL DEFAULT 0;
COMMENT ON COLUMN public.task_assigned_part."status" IS '0=>Pending,1=>Approved,2=>Rejected';

ALTER TABLE public.part_ledger ALTER COLUMN "serviceOrderNo" DROP NOT NULL;
ALTER TABLE public.part_ledger ADD "taskAssignPartId" int8 NULL;

ALTER TABLE public.task_assigned_part ALTER COLUMN quantity TYPE float8 USING quantity::float8;

CREATE TABLE public.user_notifications (
	id bigserial NOT NULL,
	"senderId" int8 NULL,
	"receiverId" int8 NULL,
	"payload" json NULL,
	"actions" json null,
	"createdAt" int8 NULL,
	"updatedAt" int8 NULL,
	"readAt" int8 NULL,
	"clickedAt" int8 NULL,
	"orgId" int8 NULL,
	CONSTRAINT user_notifications_pkey PRIMARY KEY (id)
);


CREATE TABLE public.notifications_usage_tracker (
	id bigserial NOT NULL,
	"orgId" int8 NULL,
	"sms" int8 NULL,
	"webpush" int8 NULL,
	"app" int8 NULL,
	"email" int8 null,
	"line" int8 NULL,
	"socket" int8 NULL,
	CONSTRAINT notifications_usage_tracker_pkey PRIMARY KEY (id)
);
ALTER TABLE public.notifications_usage_tracker ADD CONSTRAINT notifications_usage_tracker_un UNIQUE ("orgId");

ALTER TABLE public.part_ledger ALTER COLUMN "storeAdjustmentBy" TYPE varchar(250) USING "storeAdjustmentBy"::varchar;

ALTER TABLE public.asset_master ADD CONSTRAINT asset_master_un UNIQUE ("assetSerial","companyId","assetCode","orgId");

CREATE TABLE public.parcel_management
(
  id bigint NOT NULL DEFAULT nextval('parcel_management_id_seq'::regclass),
  "createdAt" bigint,
  "updatedAt" bigint,
  "orgId" bigint,
  "trackingNumber" bigint,
  "companyId" bigint,
  "projectId" bigint,
  "buildingPhaseId" bigint,
  "floorZoneId" bigint,
  "unitId" bigint,
  "recipientName" character varying(500),
  "carrierId" bigint,
  "senderName" character varying(500),
  "parcelCondition" character varying(250),
  "parcelType" integer,
  "parcelStatus" integer,
  "parcelPriority" integer,
  "pickedUpType" integer,
  description character varying(500),
  CONSTRAINT parcel_management_pkey PRIMARY KEY (id)
)

CREATE TABLE public.adjust_part_users (
	id bigserial NOT NULL,
	name varchar NULL,
	email varchar NULL,
	mobile varchar NULL,
	"createdAt" int8 NULL,
	"updatedAt" int8 NULL,
	"orgId" int8 NULL,
	CONSTRAINT adjust_part_users_pkey PRIMARY KEY (id)
);