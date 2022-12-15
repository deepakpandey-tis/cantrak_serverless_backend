FROM public.ecr.aws/lambda/nodejs:18

# Copy function code
COPY ./src/ ${LAMBDA_TASK_ROOT}/src/
COPY ./package.json ${LAMBDA_TASK_ROOT}/package.json


RUN cd ${LAMBDA_TASK_ROOT}
RUN pwd

RUN npm install

RUN ls

# You can overwrite command in `serverless.yml` template
CMD [ "app.server" ]
