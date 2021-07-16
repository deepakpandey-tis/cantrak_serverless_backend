CREATE OR REPLACE FUNCTION public.createandsetassetdisplayid()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
	begin		
	   if NEW."displayId" is null then
	   	NEW."displayId" := (select coalesce(max("displayId"),0)+1 from asset_master am where am."companyId" = NEW."companyId");
	   end if;
	   RETURN NEW;
	END;
$function$
;

drop trigger if exists set_asset_master_displayid on public.asset_master;

create trigger set_asset_master_displayid before
insert
    on
public.asset_master for each row execute function createandsetassetdisplayid();
