<template id="page-components-overview">
	<div class="page-components-overview" @drop.prevent="function($event) { $event.stopPropagation() }">
		<div class="tabbed-menu is-row is-spacing-xsmall is-spacing-vertical-bottom-none">
			<button @click="selected = 'components'" class="is-button is-size-xsmall" :class="{'is-active': selected == 'components'}">Components</button>
			<button @click="selected = 'operations'" class="is-button is-size-xsmall" :class="{'is-active': selected == 'operations'}">Operations</button>
		</div>
		<p class="is-p is-size-small is-color-light is-spacing-medium">Drag and drop a component of your choice into a row.</p>
		<div v-if="selected == 'components'">
			<n-collapsible :only-one-open="true" v-for="category in componentCategories" :title="prettyPrint(category)" content-class="is-pattern-underline">
				<div class="is-row is-height-fixed-4 is-align-cross-center is-spacing-horizontal-medium is-spacing-vertical-small is-highlight-light is-cursor-pointer" v-for="(component, index) in getComponentCategory(category)" :draggable="true"
						@dragstart="dragComponent($event, component)">
					<img :draggable="false" :src="'${server.root()}resources/' + component.icon" class="is-column is-width-fixed-2" v-if="component.icon && component.icon.match(/^.*\.[^.]+$/)"/>
					<icon v-else-if="component.icon" :name="component.icon" class="is-column is-width-column-1"/>
					<div class="is-column is-width-column-11">
						<h5 class="is-h5 is-size-medium is-spacing-horizontal-gap-small">
							<span class="is-text">{{ component.name }}</span>
							<span class="is-badge is-size-xsmall is-color-secondary-outline" v-if="component.type">{{component.type}}</span>
							<span class="is-badge is-size-xsmall is-color-secondary-outline" v-if="component.templateVersion">v{{component.templateVersion}}</span>
						</h5>
						<p class="is-p is-size-xsmall" v-if="component.description">{{ component.description }}</p>
					</div>
				</div>
			</n-collapsible>
		</div>
		<div v-else-if="selected == 'templates'">
			<n-collapsible class="component-category" v-for="category in templateCategories" :title="prettyPrint(category)" content-class="is-pattern-underline">
				<div class="is-row is-height-fixed-4 is-align-cross-center is-spacing-horizontal-medium is-spacing-vertical-small is-highlight-light is-cursor-pointer" v-for="template in getTemplateCategory(category)" :draggable="true"
						@dragstart="dragTemplate($event, template)">
					<img :draggable="false" :src="'${server.root()}resources/' + template.icon" class="is-column is-width-fixed-2" v-if="template.icon && template.icon.match(/^.*\.[^.]+$/)"/>
					<icon v-else-if="template.icon" :name="template.icon" class="is-column is-width-column-1"/>
					<div class="is-column is-width-column-11">
						<h5 class="is-h5 is-size-medium">{{ template.name }}<span class="is-content is-size-xsmall is-color-neutral is-spacing-horizontal-left-medium" v-if="template.type">{{template.type}}</span></h5>
						<p class="is-p is-size-xsmall" v-if="template.description">{{ template.description }}</p>
					</div>
				</div>
			</n-collapsible>
		</div>
		<div v-else-if="selected == 'operations'">
			<div class="is-column is-spacing-medium">
				<n-form-text v-model="operationSearch" placeholder="Search operations..." :timeout="300"/>
			</div>
			<n-collapsible class="component-category" v-for="category in getOperationCategories()" :title="prettyPrint(category)" content-class="is-pattern-underline" v-if="hasAnyOperationMatch(category)">
				<div class="is-row is-height-fixed-4 is-align-cross-center is-spacing-horizontal-medium is-spacing-vertical-small is-highlight-light is-cursor-pointer" v-for="operation in getOperationCategory(category)" v-if="hasAnyOperationMatch(category, operation)" :draggable="true"
						@dragstart="dragOperation($event, operation)">
					<div class="is-column is-width-column-11">
						<p class="is-p is-size-xsmall">{{ operation.id }}</p>
						<p class="is-p is-size-xxsmall" v-if="operation.summary">{{ operation.summary }}</p>
					</div>
				</div>
			</n-collapsible>
		</div>
	</div>
</template>


<template id="page-components-selector">
	<div class="is-column is-spacing-large is-color-background">
		<h2 class="is-h2">Select Component</h2>
		<div class="is-column is-pattern-underline">
			<div class="is-row is-height-fixed-4 is-spacing-medium is-cursor-pointer is-highlight-light" v-for="component in components" @click="$resolve(component)">
				<img :draggable="false" :src="'${server.root()}resources/' + component.icon" class="is-image is-ratio-square is-width-fixed-2" v-if="component.icon && component.icon.match(/^.*\.[^.]+$/)"/>
				<icon v-else-if="component.icon" :name="component.icon" class="is-column is-width-column-1"/>
				<div class="about">
					<h4 class="is-h4">{{ component.name }}</h4>
					<p class="is-p is-size-small" v-if="component.description">{{ component.description }}</p>
				</div>
			</div>
		</div>
		<div class="is-row is-align-end is-spacing-vertical-top-medium">
			<button class="is-button is-variant-secondary" @click="$reject()">Cancel</button>
		</div>
	</div>
</template>