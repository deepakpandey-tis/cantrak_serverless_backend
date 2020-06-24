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





