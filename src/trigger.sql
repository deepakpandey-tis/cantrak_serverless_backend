/*Organisation Active/Inactive Open*/
create or replace function activeOraganisation()
returns trigger
language plpgsql
as $function$
begin
	update companies set "isActive"=new."isActive" where "orgId"=new.id;
	return new;
end;
$function$

drop trigger if exists updateOrganisation_trigger on public.organisations;
create trigger updateOrganisation_trigger after update on public.organisations for each row execute procedure activeOraganisation()

/*Organisation Active/Inactive close*/

/*Company Active/Inactive Open*/
create or replace function activeCompany()
returns trigger
language plpgsql
as $function$
begin
	update projects set "isActive"=new."isActive" where "companyId"=new.id;
	return new;
end;
$function$

drop trigger if exists updateCompanyStatus_trigger on public.companies;
create trigger updateCompanyStatus_trigger after update on public.companies for each row execute procedure activeCompany()
/*Company Active/Inactive close*/

/*Project Active/Inactive Open*/
create or replace function activeProject()
returns trigger
language plpgsql
as $function$
begin
	update buildings_and_phases set "isActive"=new."isActive" where "projectId"=new.id;
	return new;
end;
$function$

drop trigger if exists updateProjectStatus_trigger on public.projects;
create trigger updateProjectStatus_trigger after update on public.projects for each row execute procedure activeProject()
/*Project Active/Inactive close*/


/*Building & Phase Active/Inactive Open*/
create or replace function activeBuilding()
returns trigger
language plpgsql
as $function$
begin
	update floor_and_zones set "isActive"=new."isActive" where "buildingPhaseId"=new.id;
	return new;
end;
$function$

drop trigger if exists updateBuildingStatus_trigger on public.buildings_and_phases;
create trigger updateProjectStatus_trigger after update on public.buildings_and_phases for each row execute procedure activeBuilding()
/*Building & Phase Active/Inactive close*/


/*Floor Active/Inactive Open*/
create or replace function activeFloor()
returns trigger
language plpgsql
as $function$
begin
	update property_units set "isActive"=new."isActive" where "floorZoneId"=new.id;
    update common_area set "isActive"=new."isActive" where "floorZoneId"=new.id;
	return new;
end;
$function$

drop trigger if exists updateFloorStatus_trigger on public.floor_and_zones;
create trigger updateFloorStatus_trigger after update on public.floor_and_zones for each row execute procedure activeFloor()
/*Floor Active/Inactive close*/