# version 16 used instead of 18 because of canvas module
FROM public.ecr.aws/lambda/nodejs:16

# Copy function code
COPY ./src/ ${LAMBDA_TASK_ROOT}/src/
COPY ./package.json ${LAMBDA_TASK_ROOT}/package.json


RUN cd ${LAMBDA_TASK_ROOT}
RUN pwd

# for Error: /lib64/libz.so.1: version `ZLIB_1.2.9' not found (required by /opt/nodejs/node_modules/canvas/build/Release/libpng16.so.16)
ENV LD_PRELOAD=/var/task/node_modules/canvas/build/Release/libz.so.1
# for Error: node_modules canvas build release libpango 10 so 0 undefined symbol g_ptr_array_copy
ENV LD_LIBRARY_PATH="/var/task/node_modules/canvas/build/Release:/var/lang/lib:/lib64:/usr/lib64:/var/runtime:/var/runtime/lib:/var/task:/var/task/lib:/opt/lib"

RUN npm install

RUN ls

# You can overwrite command in `serverless.yml` template
CMD [ "app.server" ]
