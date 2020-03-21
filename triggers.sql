---------------- For Service Request Section --------------

ALTER TABLE public.service_requests DROP COLUMN "invoiceData";
delete from public.service_requests where "projectId"  is null and "houseId" is null ;
delete from public.service_requests where "houseId" is null ;
ALTER TABLE public.service_requests ADD "companyId" int8 NULL;

--- Execute this function for create Company Id In service request table ---

CREATE OR REPLACE FUNCTION createAndsetServiceRequestCompanyId()
RETURNS trigger AS
$BODY$
begin
if NEW."houseId" is not null and NEW."companyId" is null then
NEW."companyId" := (select pu."companyId" from public.service_requests sr
left join public.property_units pu on sr."houseId" = pu.id
where sr.id = NEW.id);
end if;
RETURN NEW;
END;
$BODY$
language plpgsql volatile;

drop trigger if exists set_service_request_companyId on service_requests;
CREATE TRIGGER set_service_request_companyId BEFORE update ON service_requests FOR EACH ROW EXECUTE PROCEDURE 
createAndsetServiceRequestCompanyId();



--- Execute this function for create Display Id In service request table ---

CREATE OR REPLACE FUNCTION createAndsetServiceRequestDisplayId()
	RETURNS trigger AS
$BODY$
	begin		
	   if NEW."houseId" is not null and NEW."displayId" is null then
	   	NEW."displayId" := (select rnum from (
												select row_number() OVER (order by sr.id nulls last) as rnum, 
                                                sr.id from public.service_requests sr
												where "companyId" = NEW."companyId" order by sr.id 
											)
							as records where records.id = new.id
						);
	   end if;
	   RETURN NEW;
	END;
$BODY$
language plpgsql volatile;


drop trigger if exists set_service_request_displayId on service_requests;
CREATE TRIGGER set_service_request_displayId BEFORE update ON service_requests FOR EACH ROW EXECUTE PROCEDURE  
createAndsetServiceRequestDisplayId();




---------------- For Quotations Section ----------------

delete from quotations where "serviceRequestId" is null and "companyId" is null
ALTER TABLE public.quotations ADD "displayId" int8 NULL;


--- Execute this function for create Display Id In quotations table ---

CREATE OR REPLACE FUNCTION createAndsetQuotationDisplayId()
	RETURNS trigger AS
$BODY$
	begin		
	   if NEW."displayId" is null then
	   	NEW."displayId" := (select rnum from (
												select row_number() OVER (order by q.id nulls last) as rnum, q.id from public.quotations q
												where "companyId" = NEW."companyId" order by q.id 
											)
							as records where records.id = new.id
						);
	   end if;
	   RETURN NEW;
	END;
$BODY$
language plpgsql volatile;


drop trigger if exists set_quotation_displayId on quotations;
CREATE TRIGGER set_quotation_displayId BEFORE update ON quotations FOR EACH ROW EXECUTE PROCEDURE  
createAndsetQuotationDisplayId();




---------------- For Service Orders ----------------

ALTER TABLE public.service_orders ADD "companyId" int8 NULL;
ALTER TABLE public.service_orders ADD "displayId" int8 NULL;


--- Execute this function for create Company Id In service orders table ---

delete from service_orders so where so.id in(select so.id from public.service_orders so left  join 
	public.service_requests sr on so."serviceRequestId" = sr.id
where sr.id is null );


CREATE OR REPLACE FUNCTION createAndsetServiceOrderCompanyId()
	RETURNS trigger AS
$BODY$
	begin		
	   if NEW."serviceRequestId" is not null and NEW."companyId" is null then
	   	NEW."companyId" := (select sr."companyId" from public.service_orders so 
								left join public.service_requests sr on sr."id" = so."serviceRequestId"
							where  so.id = NEW.id);
	   end if;
	   RETURN NEW;
	END;
$BODY$
language plpgsql volatile;

drop trigger if exists set_service_orders_companyId on service_orders;
CREATE TRIGGER set_service_orders_companyId before insert or update ON service_orders FOR EACH ROW EXECUTE PROCEDURE 
createAndsetServiceOrderCompanyId();

update public.service_orders  set "shareOrder" = null where 1=1;


--- Execute this function for create Display Id In Service Order table ---


CREATE OR REPLACE FUNCTION createAndsetServiceOrderDisplayId()
	RETURNS trigger AS
$BODY$
	begin		
	   if NEW."companyId" is not null and NEW."displayId" is null then
	   	NEW."displayId" := (select rnum from (
												select row_number() OVER (order by so.id nulls last) as rnum, so.id from public.service_orders so
												where "companyId" = NEW."companyId" order by so.id 
											)
							as records where records.id = new.id
						);
	   end if;
	   RETURN NEW;
	END;
$BODY$
language plpgsql volatile;


drop trigger if exists set_service_request_displayId on service_orders;
CREATE TRIGGER set_service_orders_displayId before insert or update ON service_orders FOR EACH ROW EXECUTE PROCEDURE 
createAndsetServiceOrderDisplayId();





---------------- For Survey Orders ----------------

ALTER TABLE public.survey_orders ADD "companyId" int8 NULL;
ALTER TABLE public.survey_orders ADD "displayId" int8 NULL;


--- Execute this function for create Company Id In Survey orders table ---


CREATE OR REPLACE FUNCTION createAndsetSurveyOrderCompanyId()
	RETURNS trigger AS
$BODY$
	begin		
	   if NEW."serviceRequestId" is not null and NEW."companyId" is null then
	   	NEW."companyId" := (select sr."companyId" from public.survey_orders so 
								left join public.service_requests sr on sr."id" = so."serviceRequestId"
							where  so.id = NEW.id);
	   end if;
	   RETURN NEW;
	END;
$BODY$
language plpgsql volatile;

drop trigger if exists set_survey_orders_companyId on survey_orders;
CREATE TRIGGER set_survey_orders_companyId before insert or update ON survey_orders FOR EACH ROW EXECUTE PROCEDURE  
createAndsetSurveyOrderCompanyId();

update public.survey_orders  set "surveyInProcess" = null where 1=1;

delete from survey_orders so where so.id in(select so.id from public.survey_orders so left  join 
	public.service_requests sr on so."serviceRequestId" = sr.id
where sr.id is null );	


--- Execute this function for create Display Id In Survey Orders table ---


CREATE OR REPLACE FUNCTION createAndsetSurveyOrderDisplayId()
	RETURNS trigger AS
$BODY$
	begin		
	   if NEW."companyId" is not null and NEW."displayId" is null then
	   	NEW."displayId" := (select rnum from (
												select row_number() OVER (order by so.id nulls last) as rnum, so.id from public.survey_orders so
												where "companyId" = NEW."companyId" order by so.id 
											)
							as records where records.id = new.id
						);
	   end if;
	   RETURN NEW;
	END;
$BODY$
language plpgsql volatile;


drop trigger if exists set_survey_orders_displayId on survey_orders;
CREATE TRIGGER set_survey_orders_displayId before insert or update ON survey_orders FOR EACH ROW EXECUTE PROCEDURE  
createAndsetSurveyOrderDisplayId();




---------------- For PM Master ----------------

delete from public.pm_master2 pm where pm."companyId" is null;

ALTER TABLE public.pm_master2 ADD "displayId" int8 NULL;

--- Execute this function for create Display Id In PM master table ---

CREATE OR REPLACE FUNCTION createAndsetPMDisplayId()
	RETURNS trigger AS
$BODY$
	begin		
	   if NEW."companyId" is not null and NEW."displayId" is null then
	   	NEW."displayId" := (select rnum from (
												select row_number() OVER (order by pm.id nulls last) as rnum, pm.id from public.pm_master2 pm
												where "companyId" = NEW."companyId" order by pm.id 
											)
							as records where records.id = new.id
						);
	   end if;
	   RETURN NEW;
	END;
$BODY$
language plpgsql volatile;


drop trigger if exists set_pm_master2_displayId on pm_master2;
CREATE TRIGGER set_pm_master2_displayId before insert or update ON pm_master2 FOR EACH ROW EXECUTE PROCEDURE  createAndsetPMDisplayId();


update public.pm_master2  set "isActive" = true where "isActive"=true;




