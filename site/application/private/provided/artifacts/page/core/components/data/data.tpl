<template id="data-configure">
	<div class="is-column is-spacing-gap-medium">
		<n-form-combo label="Data type" 
			v-if="!target.type"
			v-model="target.type" :filter="getRepeatTypes"
			:formatter="function(x) { return x.title }"
			:extracter="function(x) { return x.name }"/>
		
		<n-form-combo label="Operation" v-model="target.operation" 
			:filter="$services.page.getArrayOperations"
			v-if="target.type == 'operation'"
			:formatter="function(x) { return x.id }"
			:extracter="function(x) { return x.id }"/>
		<n-form-combo label="Array" v-model="target.array"
			:filter="function(value) { return $services.page.getAllArrays(page) }"
			v-else-if="target.type == 'array'"
			/>
			
		<component v-if="getRepeatConfigurator()" :is="getRepeatConfigurator()" :target="target" :page="page"/>
			
		<n-form-text v-model="target.emptyPlaceholder" label="Empty Place Holder" after="Can be shown if there is no data"/>
		<n-form-text v-model="target.loadingPlaceholder" label="Loading Place Holder" v-if="target.operation" after="Can be shown while the operation is loading data"/>
		
		<div v-for="(defaultOrderBy, index) in target.defaultOrderBy" class="has-button-close">
			<div class="is-row">
				<n-form-combo v-model="defaultOrderBy.name" :filter="getOrderByFields" placeholder="Order by field"/>
				<n-form-combo v-model="defaultOrderBy.direction" :items="['asc', 'desc']" placeholder="Direction"/>
			</div>
			<button class="is-button is-variant-close is-size-small is-spacing-horizontal-right-large" @click="target.defaultOrderBy.splice(index, 1)"><icon name="times"/></button>
		</div>
		<div class="is-row is-align-end" v-if="getOrderByFields()">
			<button @click="target.defaultOrderBy.push({name: null, direction: 'asc'})" class="is-button is-size-small"><icon name="plus"/><span class="is-title">Order by</span></button>
		</div>
		
		<n-page-mapper v-if="target.operation && operationParameters.length > 0 && Object.keys($services.page.getPageParameters(page)).length" 
			:to="operationParameters"
			:from="$services.page.getAvailableParameters(page, null, true)"
			v-model="target.bindings"/>
	</div>
</template>


<template id="data-pipeline-configure">
	<div class="is-column is-spacing-gap-medium has-button-close">
		<n-form-text v-model="target.runtimeAlias" label="The runtime alias for this data" after="You can expose this data to the rest of the page for other uses"/>
		<data-configure :target="pipeline" :page="page"/>
		<n-form-ace :label="target.operation || target.array ? 'Transformation script' : 'Generation script'" v-model="target.script"/>
		<n-form-ace label="Example of expected output" v-if="target.script" v-model="target.template"/>
		<button v-if="removable" class="is-button is-variant-close is-size-small is-spacing-horizontal-right-large" @click="$emit('remove')"><icon name="times"/></button>
		<slot></slot>
	</div>
</template>

<template id="data-pipelines-configure">
	<div class="is-column is-spacing-gap-medium">
		<data-pipeline-configure :pipeline="pipeline" v-for="(pipeline, index) in target.pipelines" @remove="target.pipelines.splice(index, 1)"
			:removable="allowed != 1"
			:page="page"
			:target="target"
			:edit="edit">
			<slot name="pipeline" :pipeline="pipeline"/>
		</data-pipeline-configure>
		<div class="is-row is-align-end" v-if="allowed == null || allowed > target.pipelines.length">
			<button @click="addPipeline" class="is-button is-variant-primary-outline is-size-small"><icon name="plus"/><span class="is-text">Pipeline</span></button>
		</div>
	</div>
</template>