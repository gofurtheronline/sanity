import React, {useCallback} from 'react'
import {
  isValidationErrorMarker,
  Marker,
  Path,
  Reference,
  ReferenceFilterSearchOptions,
  ReferenceSchemaType,
  SanityDocument,
} from '@sanity/types'
import PatchEvent, {set, setIfMissing, unset} from '../../PatchEvent'
import withDocument from '../../utils/withDocument'
import withValuePath from '../../utils/withValuePath'
import {ChangeIndicatorCompareValueProvider} from '@sanity/base/lib/change-indicators/ChangeIndicator'
import FormField from 'part:@sanity/components/formfields/default'
import styles from './styles/ReferenceInput.css'
import Button from 'part:@sanity/components/buttons/default'
import {get} from '@sanity/util/paths'
import {Observable, of} from 'rxjs'
import {useId} from '@reach/auto-id'
import {tap} from 'rxjs/operators'
// import {Autocomplete} from './Autocomplete'
import {Box, Card, Flex, Autocomplete} from '@sanity/ui'
import Preview from '../../Preview'
import LinkIcon from 'part:@sanity/base/link-icon'
import {IntentLink} from '../../../../state-router/src/components'

type SearchResult = {
  _id: string
  _type: string
}

type PreviewSnapshot = {
  _id: string
  _type: string
  title: string
  description: string
}

type SearchError = {
  message: string
  details?: {
    type: string
    description: string
  }
}
type SearchFunction = (
  query: string,
  type: ReferenceSchemaType,
  options: ReferenceFilterSearchOptions
) => Observable<SearchHit[]>

export type Props = {
  value?: Reference
  compareValue?: Reference
  type: ReferenceSchemaType
  markers: Marker[]
  focusPath: Path
  readOnly?: boolean
  onSearch: SearchFunction
  onFocus: (path: Path) => void
  getPreviewSnapshot: (reference, type) => Observable<PreviewSnapshot | null>
  onChange: (event: PatchEvent) => void
  level: number
  presence: any

  // From withDocument
  document: SanityDocument

  // From withValuePath
  getValuePath: () => Path
}

function getMemberTypeFor(typeName: string, ownerType: ReferenceSchemaType) {
  return ownerType.to.find((ofType) => ofType.type.name === typeName)
}

const todo = (...args: any[]) => alert('todo')

export function useSearchResults(
  searchTerm: string | null,
  type: ReferenceSchemaType,
  filterOpts: ReferenceFilterSearchOptions,
  searchFn: SearchFunction
) {
  const [hits, setHits] = React.useState<SearchHit[]>([])
  React.useEffect(() => {
    if (searchTerm !== null) {
      const sub = searchFn(searchTerm, type, filterOpts)
        .pipe(tap((res) => setHits(res)))
        .subscribe()
      return () => sub.unsubscribe()
    }
    return () => {}
  }, [searchTerm])
  return hits
}

type SearchHit = {
  _id: string
  _type: string
}

function resolveUserDefinedFilter(options, document, valuePath): ReferenceFilterSearchOptions {
  const filter = options.filter
  const params = 'filterParams' in options ? options.filterParams : undefined
  if (typeof filter === 'function') {
    const parentPath = valuePath.slice(0, -1)
    const parent = get(document, parentPath) as Record<string, unknown>
    return filter({document, parentPath, parent})
  }

  return {filter, params}
}
const ReferenceInput = React.forwardRef(function ReferenceInput(
  props: Props,
  forwardedRef: React.ForwardedRef<HTMLInputElement>
) {
  const {
    type,
    value,
    level,
    markers,
    readOnly,
    onSearch,
    onChange,
    presence,
    document,
    getValuePath,
    compareValue,
    getPreviewSnapshot,
  } = props
  const options = type.options

  const [inputValue, setInputValue] = React.useState<string | null>(null)

  const hits = useSearchResults(
    inputValue,
    type,
    options?.filter ? resolveUserDefinedFilter(options?.filter, document, getValuePath()) : {},
    onSearch
  )

  const handleSelect = React.useCallback(
    (item: SearchHit) => {
      setInputValue(null)
      onChange(
        PatchEvent.from(
          setIfMissing({
            _type: type.name,
            _ref: item._id,
          }),
          type.weak === true ? set(true, ['_weak']) : unset(['_weak']),
          set(item._id, ['_ref'])
        )
      )
    },
    [onChange, type]
  )

  const handleInputChange = React.useCallback((query: string) => {
    setInputValue(query)
  }, [])

  const [
    {snapshot: previewSnapshot, state: snapshotLoadingState},
    setPreviewSnapshot,
  ] = React.useState<{
    state: 'loading' | 'loaded'
    snapshot: null | {title: string; description: string}
  }>({
    state: 'loading',
    snapshot: null,
  })

  React.useEffect(() => {
    if (value?._ref) {
      setPreviewSnapshot({state: 'loading', snapshot: null})
      const sub = getPreviewSnapshot(value, type)
        .pipe(tap((snapshot) => setPreviewSnapshot({state: 'loaded', snapshot})))
        .subscribe()
      return () => {
        sub.unsubscribe()
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => {}
  }, [value?._ref])

  const inputId = useId()
  const isMissing = value?._ref && snapshotLoadingState === 'loaded' && previewSnapshot === null

  const weakIs = value && value._weak ? 'weak' : 'strong'
  const weakShouldBe = type.weak === true ? 'weak' : 'strong'

  const hasRef = value && value._ref
  const hasWeakMismatch = hasRef && !isMissing && weakIs !== weakShouldBe
  const errors = markers.filter(isValidationErrorMarker)

  let controlledInputValue = ''
  if (inputValue === null) {
    controlledInputValue = previewSnapshot ? previewSnapshot?.title || 'Untitled' : ''
  } else {
    controlledInputValue = inputValue
  }
  const isLoadingSnapshot = value && value._ref && !previewSnapshot
  const placeholder = isLoadingSnapshot ? 'Loading…' : 'Type to search…'
  return (
    <ChangeIndicatorCompareValueProvider value={value?._ref} compareValue={compareValue?._ref}>
      <FormField
        labelFor={inputId}
        markers={markers}
        label={type.title}
        level={level}
        description={type.description}
        presence={presence}
      >
        <div className={hasWeakMismatch || isMissing ? styles.hasWarnings : ''}>
          {hasWeakMismatch && (
            <div className={styles.weakRefMismatchWarning}>
              Warning: This reference is <em>{weakIs}</em>, but should be <em>{weakShouldBe}</em>{' '}
              according to schema.
              <div>
                <Button onClick={todo}>Convert to {weakShouldBe}</Button>
              </div>
            </div>
          )}
          <Flex>
            <Box flex={1}>
              <Autocomplete
                ref={forwardedRef}
                id={inputId}
                options={hits}
                inputValue={controlledInputValue}
                placeholder={placeholder}
                onInputChange={handleInputChange}
                onSelect={handleSelect}
                renderOption={(option) => (
                  <Card as="button" href={`/?id=${option._key}`}>
                    <Box paddingX={3} paddingY={2}>
                      <Preview type={type} value={{_ref: option._id}} layout="default" />
                    </Box>
                  </Card>
                )}
              />
            </Box>
            {previewSnapshot && (
              <Box padding={[0, 2]}>
                <IntentLink
                  title={`Open ${previewSnapshot.title}`}
                  intent="edit"
                  params={{
                    id: value?._ref,
                    type: previewSnapshot ? previewSnapshot._type : undefined,
                  }}
                  className={styles.referenceLink}
                >
                  <LinkIcon />
                </IntentLink>
              </Box>
            )}
          </Flex>
        </div>
      </FormField>
    </ChangeIndicatorCompareValueProvider>
  )
})

export default withValuePath(withDocument(ReferenceInput))
