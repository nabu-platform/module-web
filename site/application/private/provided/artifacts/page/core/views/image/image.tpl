<template id="page-image-configure">
	<div class="is-column is-spacing-medium">
		<div v-if="!cell.state.imageType">
			<n-form-radio label="Type of image"
				v-model="cell.state.imageType"
				:items="[{name: 'variable', title: 'Based on variable'}, {name: 'static', title: 'Static image'}, {name: 'operation', title: 'Image loaded from a REST call'}, {name: 'bytes', title: 'Image loaded from a byte array'}]"
				:formatter="function(x) { return x.title }"
				:extracter="function(x) { return x.name }"/>
		</div>
		<div v-else-if="cell.state.imageType == 'static'" class="is-column is-spacing-gap-medium">
			<n-form-text v-model="cell.state.href" label="Full Link" v-if="!cell.state.imagePath"/>
			<n-form-text v-model="cell.state.imagePath" label="Image path to search" v-if="!cell.state.href"/>
			<n-form-switch v-model="cell.state.absolute" label="Absolute" v-if="!cell.state.inline"/>
			<div class="is-inline-image-menu" v-if="edit">
				<button class="is-button is-variant-primary is-size-xsmall is-position-center" :disabled="!hasPrevious" @click="previous"><icon name="chevron-left"/><span class="is-text">Previous</span></button>
				<n-input-file v-model="files" @change="upload" :types="['image/*']"/>
				<button class="is-button is-variant-primary is-size-xsmall is-position-center" :disabled="!hasNext" @click="next"><icon name="chevron-right"/><span class="is-text">Next</span></button>
			</div>
		</div>
		<div v-else-if="cell.state.imageType == 'operation'" class="is-column is-spacing-gap-medium">
			<n-form-combo v-model="cell.state.imageOperation" :filter="$services.page.getBinaryOperations"
				label="Operation to use"
				:formatter="function(x) { return x.id }"
				:extracter="function(x) { return x.id }"/>
				
			<n-page-mapper v-if="cell.state.imageOperation" 
				:to="$services.page.getSwaggerOperationInputDefinition(cell.state.imageOperation)"
				:from="$services.page.getAllAvailableParameters(page)" 
				:key="cell.state.operation + '-image-mapper'"
				v-model="cell.state.bindings"/>
		</div>
		<div v-else-if="cell.state.imageType == 'bytes'" class="is-column is-spacing-gap-medium">
			<p class="is-p">Add mappings for the byte content</p>
			<n-page-mapper 
				:to="['byteValue', 'contentTypeValue']"
				:from="$services.page.getAllAvailableParameters(page)" 
				:key="cell.state.operation + '-image-byte-data'"
				v-model="cell.state"/>
			<n-form-combo v-model="cell.state.byteValue" :filter="getAllKeys" label="Byte field" v-if="false"/>
			<n-form-combo v-model="cell.state.contentTypeValue" :filter="getAllKeys" label="Content type field" placeholder="image/jpeg" v-if="false"/>
		</div>
		<div v-else-if="cell.state.imageType == 'variable'" class="is-column is-spacing-gap-medium">
			<n-form-combo v-model="cell.state.imageUrlVariable" :filter="function(value) { return $services.page.getPageVariables(page, value) }"
				label="URL Variable"/>
		</div>
		
		<div v-if="cell.state.imageType" class="is-column is-spacing-gap-medium">
			<n-form-text v-model="cell.state.title" label="Title"/>
			<n-form-text v-model="cell.state.emptyImage" label="The placeholder image to show if no image is available"/>
			<div class="is-row is-align-end is-spacing-vertical-medium">
				<button class="is-button is-variant-danger-outline is-size-xsmall" @click="cell.state.imageType = null">Reset Image Type</button>
			</div>
		</div>
	</div>
</template>

<template id="page-image">
	<img :src="calculatedUrl ? calculatedUrl : emptyImage"
		class="is-image"
		:draggable="false"
		:class="getChildComponentClasses('image')"
		:title="title"/>
</template>