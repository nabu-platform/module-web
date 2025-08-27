<template id="renderer-repeat">
	<div v-fragment>
		<template v-if="!edit && !loading && state.records.length">
			<template v-if="fragmentPage.content.repeatType == 'cell'">
				<template v-for="(record, index) in state.records">
					<component :is="getComponent()" :class="getCellClasses()" :page="page" :target="target" v-visible="lazyLoad.bind($self, record)">
						<template v-if="!edit && !loading && state.records.length && fragmentPage.content.rows.length >= 2">
							<n-page v-fragment
								:$set-value="repeatSetter"
								:page="fragmentPage"
								@update="function() { update(record) }"
								@click.native="handleClick($event, record)"
								:fragment-parent="getPageInstance()"
								:record-index="index" class="is-repeat-content" 
								:draggable="target.repeat.enableDrag"
								@dragstart.native="onDragStart($event, record)"
								:class="[getChildComponentClasses('repeat-content'), {'is-selected': state.selected.indexOf(record) >= 0 }, {'is-selectable': target.repeat.selectable}]"
								:key="'repeat_' + instanceCounter + '_rendered_' + getKey(record)"
								:parameters="getParameters(record)"
								@beforeMount="beforeMount"
								@ready="mounted"/>
						</template>
						<template v-else-if="!edit && !loading && state.records.length">
							<n-page-optimized :page="fragmentPage"
								:$set-value="repeatSetter"
								@update="function() { update(record) }"
								@click.native="handleClick($event, record)"
								:fragment-parent="getPageInstance()"
								:record-index="index" class="is-repeat-content" 
								:draggable="target.repeat.enableDrag"
								@dragstart.native="onDragStart($event, record)"
								:class="[getChildComponentClasses('repeat-content'), {'is-selected': state.selected.indexOf(record) >= 0 }, {'is-selectable': target.repeat.selectable}]"
								:key="'repeat_' + instanceCounter + '_rendered_' + getKey(record)"
								:parameters="getParameters(record)"
								@beforeMount="beforeMount"
								@ready="mounted"/>
						</template>
					</component>
					<component :is="getComponent()" :cell="getCellClasses()" :page="page" :target="target" v-for="slot in getAdditionalSlots(index)">
						<template v-if="!edit && !loading && state.records.length && fragmentPages[slot].content.rows.length >= 2">
							<n-page :page="fragmentPages[slot]"
								:$set-value="repeatSetter"
								@update="function() { update(record) }"
								@click.native="handleClick($event, record)"
								:fragment-parent="getPageInstance()"
								:record-index="index" class="is-repeat-content" 
								:draggable="target.repeat.enableDrag"
								@dragstart.native="onDragStart($event, record)"
								:class="[getChildComponentClasses('repeat-content'), {'is-selected': state.selected.indexOf(record) >= 0 }, {'is-selectable': target.repeat.selectable}]"
								:key="'repeat_' + instanceCounter + '_rendered_' + getKey(record) + '_' + slot"
								:parameters="getParameters(record)"
								@beforeMount="beforeMount"
								@ready="mounted"/>
						</template>
						<template v-else-if="!edit && !loading && state.records.length">
							<n-page-optimized :page="fragmentPages[slot]"
								:$set-value="repeatSetter"
								@update="function() { update(record) }"
								@click.native="handleClick($event, record)"
								:fragment-parent="getPageInstance()"
								:record-index="index" class="is-repeat-content" 
								:draggable="target.repeat.enableDrag"
								@dragstart.native="onDragStart($event, record)"
								:class="[getChildComponentClasses('repeat-content'), {'is-selected': state.selected.indexOf(record) >= 0 }, {'is-selectable': target.repeat.selectable}]"
								:key="'repeat_' + instanceCounter + '_rendered_' + getKey(record) + '_' + slot"
								:parameters="getParameters(record)"
								@beforeMount="beforeMount"
								@ready="mounted"/>
						</template>
					</component>
				</template>
				<slot name="appendLoading" v-if="appendLoading"></slot>
			</template>
			<template v-else>
				<template v-if="!edit && !loading && state.records.length && fragmentPage.content.rows.length >= 2">
					<template v-for="(record, index) in state.records">
						<n-page :page="fragmentPage"
							v-visible="lazyLoad.bind($self, record)"
							:$set-value="repeatSetter"
							@update="function() { update(record) }"
							@click.native="handleClick($event, record)"
							:fragment-parent="getPageInstance()"
							:record-index="index" class="is-repeat-content" 
							:draggable="target.repeat.enableDrag"
							@dragstart.native="onDragStart($event, record)"
							:class="[getChildComponentClasses('repeat-content'), {'is-selected': state.selected.indexOf(record) >= 0 }, {'is-selectable': target.repeat.selectable}]"
							:key="'repeat_' + instanceCounter + '_rendered_' + getKey(record)"
							:parameters="getParameters(record)"
							@beforeMount="beforeMount"
							@ready="mounted"/>
						<n-page 
							:$set-value="repeatSetter"
							v-for="slot in getAdditionalSlots(index)"
							:page="fragmentPages[slot]"
							@update="function() { update(record) }"
							@click.native="handleClick($event, record)"
							:fragment-parent="getPageInstance()"
							:record-index="index" class="is-repeat-content" 
							:draggable="target.repeat.enableDrag"
							@dragstart.native="onDragStart($event, record)"
							:class="[getChildComponentClasses('repeat-content'), {'is-selected': state.selected.indexOf(record) >= 0 }, {'is-selectable': target.repeat.selectable}]"
							:key="'repeat_' + instanceCounter + '_rendered_' + getKey(record) + '_' + slot"
							:parameters="getParameters(record)"
							@beforeMount="beforeMount"
							@ready="mounted"/>
					</template>
					<slot name="appendLoading" v-if="appendLoading"></slot>
				</template>
				<template v-else-if="!edit && !loading && state.records.length">
					<template v-for="(record, index) in state.records">
						<n-page-optimized :page="fragmentPage"
							v-visible="lazyLoad.bind($self, record)"
							:$set-value="repeatSetter"
							@update="function() { update(record) }"
							@click.native="handleClick($event, record)"
							:fragment-parent="getPageInstance()"
							:record-index="index" class="is-repeat-content" 
							:draggable="target.repeat.enableDrag"
							@dragstart.native="onDragStart($event, record)"
							:class="[getChildComponentClasses('repeat-content'), {'is-selected': state.selected.indexOf(record) >= 0 }, {'is-selectable': target.repeat.selectable}]"
							:key="'repeat_' + instanceCounter + '_rendered_' + getKey(record)"
							:parameters="getParameters(record)"
							@beforeMount="beforeMount"
							@ready="mounted"/>
						<n-page-optimized
							:$set-value="repeatSetter"
							v-for="slot in getAdditionalSlots(index)"
							:page="fragmentPages[slot]"
							@update="function() { update(record) }"
							@click.native="handleClick($event, record)"
							:fragment-parent="getPageInstance()"
							:record-index="index" class="is-repeat-content" 
							:draggable="target.repeat.enableDrag"
							@dragstart.native="onDragStart($event, record)"
							:class="[getChildComponentClasses('repeat-content'), {'is-selected': state.selected.indexOf(record) >= 0 }, {'is-selectable': target.repeat.selectable}]"
							:key="'repeat_' + instanceCounter + '_rendered_' + getKey(record) + '_' + slot"
							:parameters="getParameters(record)"
							@beforeMount="beforeMount"
							@ready="mounted"/>
					</template>
					<slot name="appendLoading" v-if="appendLoading"></slot>
				</template>
			</template>
		</template>
		<template v-else-if="edit && getComponent()">
			<component :is="getComponent()" :page="page" :target="target" :class="getComponentClassesForEdit()">
				<slot></slot>
				<slot name="appendLoading"></slot>
			</component>
		</template>
		<template v-else-if="edit">
			<slot></slot>
			<slot name="appendLoading"></slot>
		</template>
		<template v-if="edit && target.repeat.customSlots">
			<slot v-for="customSlot in target.repeat.customSlots" :name="customSlot.name"></slot>
		</template>
		<template v-if="edit || (created && !loading && !state.records.length)">
			<component :is="getMessageComponent()" v-if="target.repeat.emptyPlaceholder" :class="[getComponentClassesForMessage(), getChildComponentClasses('repeat-message'), getChildComponentClasses('repeat-empty')]"><span class="is-text" v-html="$services.page.translate(target.repeat.emptyPlaceholder)"></span></component>
			<slot name="empty"></slot>
		</template>
		<template v-if="edit || loading">
			<component :is="getMessageComponent()" v-if="target.repeat.loadingPlaceholder" :class="[getComponentClassesForMessage(), getChildComponentClasses('repeat-message'), getChildComponentClasses('repeat-loading')]"><span class="is-text" v-html="$services.page.translate(target.repeat.loadingPlaceholder)"></span></component>
			<slot name="loading"></slot>
		</template>
	</div>
</template>

<template id="renderer-repeat-configure">
	<div class="is-column is-spacing-vertical-gap-medium">
		<n-form-combo label="Repeat over" 
			v-model="target.repeat.type" :filter="getRepeatTypes"
			:formatter="function(x) { return x.title }"
			:extracter="function(x) { return x.name }"/>
			
		<n-form-combo label="Operation" v-model="target.repeat.operation" 
			:filter="$services.page.getArrayOperations"
			v-if="target.repeat.type == 'operation'"
			:formatter="function(x) { return x.id }"
			:extracter="function(x) { return x.id }"/>
			
		<n-form-combo label="Array" v-model="target.repeat.array"
			:filter="function(value) { return $services.page.suggestArray(page, value) }"
			v-else-if="target.repeat.type == 'array'"
			/>
			
		<component v-if="getRepeatConfigurator()" :is="getRepeatConfigurator()" :target="target.repeat" :page="page"/>
			
		<n-form-ace v-model="target.repeat.arrayFilter" label="Filter the array">
			<code>
			function(record) {<br/>
			&nbsp;&nbsp;&nbsp;&nbsp;return !record.myField;<br/>
			}
			</code>
		</n-form-ace>
		
		<n-form-text v-model="target.repeat.emptyPlaceholder" label="Empty Place Holder"/>
		<n-form-text v-model="target.repeat.loadingPlaceholder" label="Loading Place Holder" v-if="target.repeat.operation"/>
		<n-form-text v-model="target.repeat.refreshInterval" label="Refresh interval" :timeout="600" v-if="target.repeat.operation"/>
		
		<n-form-switch v-model="target.repeat.enableParameterWatching" label="Watch bound values for change"/>
		<n-form-switch v-model="target.repeat.waitForPageLoad" label="Wait for page rendering to complete"
			after="The repeat will only load data once the full page has been rendered, this makes sure that all filters have finished all calculations"/>
		
		<n-form-switch v-model="target.repeat.enableDrag" label="Enable dragging"/>
		<n-form-text v-model="target.repeat.dragName" label="Drag source name" v-if="target.repeat.enableDrag" placeholder="default"/>
		
		<n-form-switch v-model="target.repeat.selectable" label="Enable item selection"/>
		<n-form-switch v-model="target.repeat.multiSelectable" v-if="target.repeat.selectable" label="Enable multiselect"/>
		<n-form-switch v-model="target.repeat.alwaysMultiselect" v-if="target.repeat.selectable && target.repeat.multiSelectable" label="Multiselect without ctrl/cmd" after="If you enable this switch, multiselection can be done by clicking without the need for holding ctrl/cmd"/>
		<n-form-switch v-model="target.repeat.disableMouseSelection" v-if="target.repeat.selectable" label="Disable mouse selection"/>
		
		<n-form-switch v-model="target.repeat.raw" label="Add raw data"/>
			
		<n-form-switch v-if="target.repeat.type == 'operation'" v-model="target.repeat.scrollLoad" label="Lazy Loading"/> 
			
		<div v-for="(defaultOrderBy, index) in target.repeat.defaultOrderBy" class="has-button-close">
			<div class="is-row">
				<n-form-combo v-model="defaultOrderBy.name" :filter="getOrderByFields" placeholder="Order by field"/>
				<n-form-combo v-model="defaultOrderBy.direction" :items="['asc', 'desc']" placeholder="Direction"/>
				<n-form-combo v-model="defaultOrderBy.nulls" :items="['nulls first', 'nulls last']"/>
			</div>
			<button class="is-button is-variant-close is-size-small is-spacing-horizontal-right-large" @click="target.repeat.defaultOrderBy.splice(index, 1)"><icon name="times"/></button>
		</div>
		<div class="is-row is-align-end" v-if="getOrderByFields().length">
			<button @click="target.repeat.defaultOrderBy.push({name: null, direction: 'asc'})" class="is-button is-size-small"><icon name="plus"/><span class="is-title">Order by</span></button>
		</div>
		<p v-else class="is-p is-size-small is-variant-danger-outline">Order by not supported</p>
			
		<div v-for="(customSlot, index) in target.repeat.customSlots" class="is-column has-button-close">
			<n-form-text v-model="customSlot.name" placeholder="Slot name"/>
			<n-form-switch v-model="customSlot.singleOpen" label="Only one open at a time"/>
			<button class="is-button is-variant-close is-size-small is-spacing-horizontal-right-large" @click="target.repeat.customSlots.splice(index, 1)"><icon name="times"/></button>
		</div>
		<div class="is-row is-align-end">
			<button @click="target.repeat.customSlots.push({name: null, singleOpen: false})" class="is-button is-size-small"><icon name="plus"/><span class="is-title">Custom slot</span></button>
		</div>
		
		<template v-if="target.repeat.localVariables">
			<div v-for="(localVariable, index) in target.repeat.localVariables" class="has-button-close">
				<div class="is-column is-spacing-medium">
					<n-form-text label="Name" v-model="localVariable.name" />
					<n-form-text label="Type" v-model="localVariable.definition" placeholder="string"/>
					<n-form-switch label="Is an array" v-model="localVariable.isArray"/>
					<n-form-ace v-model="localVariable.defaultValue" label="Default value"/>
					<n-form-ace v-if="!localVariable.definition" v-model="localVariable.template" label="Template value" info="Add an object that represents the final structure of the resultset"/>
				</div>
				<button class="is-button is-variant-close is-size-small is-spacing-horizontal-right-large" @click="target.repeat.localVariables.splice(index, 1)"><icon name="times"/></button>
			</div>
			<div class="is-row is-align-end" v-if="getOrderByFields().length">
				<button @click="target.repeat.localVariables.push({name: null, definition: null})" class="is-button is-size-small"><icon name="plus"/><span class="is-title">Local variable</span></button>
			</div>
		</template>
			
		<n-page-mapper v-if="false && target.repeat.operation && operationParameters.length > 0 && Object.keys($services.page.getPageParameters(page)).length" 
			:to="operationParameters"
			:from="{page:$services.page.getPageParameters(page)}" 
			v-model="target.repeat.bindings"/>
	</div>
</template> 



